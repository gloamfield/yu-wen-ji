(function () {
  "use strict";

  const E = window.Ember;

  E.PROVIDERS = {
    demo: { label: "演示模式", kind: "demo", defaultModel: "本地演示", needsKey: false },
    openai: { label: "OpenAI", kind: "openai", defaultModel: "gpt-4o-mini", needsKey: true },
    deepseek: { label: "DeepSeek", kind: "openai", defaultModel: "deepseek-chat", needsKey: true },
    anthropic: { label: "Claude / Anthropic", kind: "anthropic", defaultModel: "claude-3-5-sonnet-latest", needsKey: true },
    gemini: { label: "Gemini", kind: "gemini", defaultModel: "gemini-2.0-flash", needsKey: true },
    sillytavern: { label: "SillyTavern / 本地兼容", kind: "openai", defaultModel: "", needsKey: false },
    custom: { label: "自定义 OpenAI 兼容", kind: "openai", defaultModel: "", needsKey: false }
  };

  E.providerLabel = function (id) {
    return (E.PROVIDERS[id] && E.PROVIDERS[id].label) || id;
  };

  E.getProviderConfig = function (id) {
    const providerId = id || E.state.settings.provider || "demo";
    const defaults = E.DEFAULT_PROVIDER_CONFIGS[providerId] || {};
    const saved = (E.state.settings.providerConfigs && E.state.settings.providerConfigs[providerId]) || {};
    return Object.assign({}, defaults, saved);
  };

  E.activeProvider = function () {
    return E.state.settings.provider || "demo";
  };

  E.joinUrl = function (base, suffix) {
    const b = String(base || "").replace(/\/+$/, "");
    if (!suffix) return b;
    if (b.endsWith(suffix)) return b;
    return `${b}${suffix.startsWith("/") ? "" : "/"}${suffix}`;
  };

  E.anthropicEndpoint = function (base) {
    const b = String(base || "").replace(/\/+$/, "");
    if (/\/v1\/messages$/i.test(b)) return b;
    if (/\/v1$/i.test(b)) return `${b}/messages`;
    return `${b}/v1/messages`;
  };

  E.geminiEndpoint = function (base, model) {
    const b = String(base || "").replace(/\/+$/, "");
    const encodedModel = encodeURIComponent(model);
    if (/\/models\/[^/]+:generateContent$/i.test(b)) return b;
    if (/\/models$/i.test(b)) return `${b}/${encodedModel}:generateContent`;
    if (/\/v1(?:beta\d*)?$/i.test(b)) return `${b}/models/${encodedModel}:generateContent`;
    return `${b}/v1beta/models/${encodedModel}:generateContent`;
  };

  E.modelsEndpoint = function (base, kind) {
    const b = String(base || "").replace(/\/+$/, "");
    if (!b) return "";
    if (kind === "anthropic") {
      if (/\/v1\/messages$/i.test(b)) return b.replace(/\/messages$/i, "/models");
      if (/\/v1$/i.test(b) || /\/models$/i.test(b)) return E.joinUrl(b, "/models");
      return `${b}/v1/models`;
    }
    if (kind === "gemini") {
      if (/\/v1(?:beta\d*)?\/models$/i.test(b)) return b;
      if (/\/v1(?:beta\d*)?$/i.test(b)) return E.joinUrl(b, "/models");
      const modelPath = b.match(/^(.*?)\/v1(?:beta\d*)?\/models\/[^/]+(?::generateContent)?$/i);
      if (modelPath) return `${modelPath[1]}/v1beta/models`;
      return `${b}/v1beta/models`;
    }
    return E.joinUrl(b, "/models");
  };

  E.normalizeModelList = function (payload, kind) {
    const root = payload && typeof payload === "object" ? payload : {};
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(root.data)
        ? root.data
        : Array.isArray(root.models)
          ? root.models
          : Array.isArray(root.items)
            ? root.items
            : root.data && Array.isArray(root.data.models)
              ? root.data.models
              : [];
    const models = [];
    const seen = new Set();
    for (const row of rows) {
      const value = row && typeof row === "object" ? row : { id: row };
      let id = String(value.id || value.name || value.model || value.slug || "").trim();
      if (!id) continue;
      if (kind === "gemini") {
        if (id.startsWith("models/")) id = id.slice("models/".length);
        const methods = value.supportedGenerationMethods || value.supported_generation_methods;
        if (Array.isArray(methods) && methods.length && !methods.includes("generateContent")) continue;
      }
      if (!id || seen.has(id)) continue;
      seen.add(id);
      models.push(id);
    }
    return models.sort((a, b) => a.localeCompare(b, "en"));
  };

  E.httpError = async function (response) {
    let detail = "";
    try {
      const text = await response.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          detail = (data.error && (data.error.message || data.error)) || data.message || text;
        } catch (error) {
          detail = text;
        }
      }
    } catch (error) {
      detail = "";
    }
    const suffix = detail ? `：${String(detail).slice(0, 240)}` : "";
    if (response.status === 401 || response.status === 403) {
      throw new Error(`API Key 无效或没有权限（${response.status}）${suffix}`);
    }
    if (response.status === 429) {
      throw new Error(`请求太频繁或额度不足（429）${suffix}`);
    }
    if (response.status >= 500) {
      throw new Error(`模型服务端错误（${response.status}）${suffix}`);
    }
    throw new Error(`请求失败（${response.status}）${suffix}`);
  };

  E.humanError = function (error) {
    if (!error) return "未知错误";
    if (error.name === "AbortError") return "已停止生成";
    const message = String(error.message || error);
    if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
      return "连接失败：可能是网络问题，或该接口不允许浏览器跨域（CORS）。可以换一个支持 CORS 的接口，或在 SillyTavern / 本地代理中转发。";
    }
    if (/CORS/i.test(message)) {
      return "接口不允许浏览器跨域访问。请使用支持 CORS 的地址，或通过 SillyTavern / 自建转发访问。";
    }
    return message;
  };

  E.fetchProviderModels = async function (providerId) {
    const id = providerId || E.activeProvider();
    const provider = E.PROVIDERS[id] || E.PROVIDERS.demo;
    if (provider.kind === "demo") throw new Error("演示模式不需要获取模型");
    const config = E.getProviderConfig(id);
    if (!config.baseUrl) throw new Error("还没有填写接口地址");
    if (provider.needsKey && !config.apiKey) throw new Error("还没有填写 API Key");

    let url = E.modelsEndpoint(config.baseUrl, provider.kind);
    if (!url) throw new Error("还没有填写接口地址");
    const headers = { Accept: "application/json" };
    if (provider.kind === "anthropic") {
      headers["x-api-key"] = config.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "true";
      url += `${url.includes("?") ? "&" : "?"}limit=1000`;
    } else if (provider.kind === "gemini") {
      url += `${url.includes("?") ? "&" : "?"}pageSize=1000&key=${encodeURIComponent(config.apiKey)}`;
    } else if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(url, { method: "GET", headers, signal: controller.signal });
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("获取模型列表超时，请检查网络或接口地址");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status === 404 || response.status === 405) {
        throw new Error("这个接口没有提供模型列表，可以直接手动填写模型名");
      }
      await E.httpError(response);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("模型列表返回的不是 JSON，可能不是兼容接口");
    }
    const models = E.normalizeModelList(payload, provider.kind);
    if (!models.length) throw new Error("接口没有返回可用模型，可以直接手动填写模型名");
    return models;
  };

  function extractOpenAIText(data) {
    if (!data || typeof data !== "object") return "";
    const choice = data.choices && data.choices[0];
    if (!choice) return "";
    if (choice.message) {
      const content = choice.message.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content.map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part.text === "string") return part.text;
          return "";
        }).join("");
      }
      if (typeof choice.message.reasoning_content === "string") return choice.message.reasoning_content;
    }
    if (typeof choice.text === "string") return choice.text;
    return "";
  }

  async function readSSE(response, onData) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index = buffer.indexOf("\n");
      while (index >= 0) {
        let line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          if (data) onData(data);
        }
        index = buffer.indexOf("\n");
      }
    }
    const tail = buffer.trim();
    if (tail.startsWith("data:")) {
      const data = tail.slice(5).trim();
      if (data) onData(data);
    }
  }

  async function openAICompatible(config, messages, options) {
    const stream = options.stream !== false;
    const url = E.joinUrl(config.baseUrl, "/chat/completions");
    const headers = { "Content-Type": "application/json" };
    if (stream) headers.Accept = "text/event-stream";
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
    const body = {
      model: config.model,
      messages,
      temperature: options.temperature == null ? 0.85 : options.temperature,
      stream
    };
    if (options.maxTokens) body.max_tokens = options.maxTokens;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.signal
    });
    if (!response.ok) await E.httpError(response);

    const contentType = response.headers.get("content-type") || "";
    if (!stream || !response.body || !contentType.includes("text/event-stream")) {
      const data = await response.json();
      const text = extractOpenAIText(data);
      if (!text) throw new Error("接口返回了空内容");
      if (options.onDelta) options.onDelta(text);
      return text;
    }

    let full = "";
    await readSSE(response, (raw) => {
      if (raw === "[DONE]") return;
      let data;
      try {
        data = JSON.parse(raw);
      } catch (error) {
        return;
      }
      const choice = data.choices && data.choices[0];
      if (!choice) return;
      const delta = choice.delta || {};
      const piece = typeof delta.content === "string" ? delta.content : "";
      if (piece) {
        full += piece;
        if (options.onDelta) options.onDelta(piece);
      }
    });
    if (!full) throw new Error("接口没有返回可显示的内容");
    return full;
  }

  async function anthropic(config, messages, options) {
    const stream = options.stream !== false;
    const systemParts = messages.filter((message) => message.role === "system").map((message) => message.content);
    const conversation = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content }));
    const url = E.anthropicEndpoint(config.baseUrl);
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    };
    if (stream) headers.Accept = "text/event-stream";
    const body = {
      model: config.model,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature == null ? 0.85 : options.temperature,
      system: systemParts.join("\n\n"),
      messages: conversation,
      stream
    };
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.signal
    });
    if (!response.ok) await E.httpError(response);

    const contentType = response.headers.get("content-type") || "";
    if (!stream || !response.body || !contentType.includes("text/event-stream")) {
      const data = await response.json();
      const text = Array.isArray(data.content)
        ? data.content.map((part) => part && part.text ? part.text : "").join("")
        : "";
      if (!text) throw new Error("Claude 返回了空内容");
      if (options.onDelta) options.onDelta(text);
      return text;
    }

    let full = "";
    await readSSE(response, (raw) => {
      let data;
      try {
        data = JSON.parse(raw);
      } catch (error) {
        return;
      }
      if (data.type === "content_block_delta" && data.delta && data.delta.text) {
        full += data.delta.text;
        if (options.onDelta) options.onDelta(data.delta.text);
      }
    });
    if (!full) throw new Error("Claude 没有返回可显示的内容");
    return full;
  }

  async function gemini(config, messages, options) {
    const systemParts = messages.filter((message) => message.role === "system").map((message) => message.content);
    const contents = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
      }));
    const endpoint = E.geminiEndpoint(config.baseUrl, config.model);
    const url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${encodeURIComponent(config.apiKey)}`;
    const body = {
      systemInstruction: systemParts.length ? { parts: [{ text: systemParts.join("\n\n") }] } : undefined,
      contents,
      generationConfig: {
        temperature: options.temperature == null ? 0.85 : options.temperature,
        maxOutputTokens: options.maxTokens || 2048
      }
    };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options.signal
    });
    if (!response.ok) await E.httpError(response);
    const data = await response.json();
    const text = data.candidates && data.candidates[0] && data.candidates[0].content && Array.isArray(data.candidates[0].content.parts)
      ? data.candidates[0].content.parts.map((part) => part.text || "").join("")
      : "";
    if (!text) throw new Error("Gemini 返回了空内容");
    if (options.onDelta) options.onDelta(text);
    return text;
  }

  E.chatComplete = async function (messages, options) {
    const opts = options || {};
    const providerId = E.activeProvider();
    const provider = E.PROVIDERS[providerId] || E.PROVIDERS.demo;
    const config = E.getProviderConfig(providerId);
    if (provider.kind === "demo") {
      throw new Error("演示模式由本地生成，不需要请求接口");
    }
    if (!config.baseUrl) throw new Error("还没有填写接口地址");
    if (!config.model) throw new Error("还没有填写模型名");
    if (provider.needsKey && !config.apiKey) throw new Error("还没有填写 API Key");

    if (provider.kind === "anthropic") return anthropic(config, messages, opts);
    if (provider.kind === "gemini") return gemini(config, messages, opts);
    return openAICompatible(config, messages, opts);
  };

  E.pickGroupSpeaker = function (chat) {
    const ids = (chat.characterIds || []).filter(Boolean);
    if (!ids.length) return null;
    const messages = E.getChatMessages(chat.id);
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant" && message.characterId);
    if (!lastAssistant) return E.getCharacter(ids[Math.floor(Math.random() * ids.length)]);
    const index = ids.indexOf(lastAssistant.characterId);
    return E.getCharacter(ids[(index + 1) % ids.length]);
  };

  function partOfDay(hour) {
    if (hour < 5) return "凌晨";
    if (hour < 8) return "清晨";
    if (hour < 11) return "上午";
    if (hour < 13) return "中午";
    if (hour < 17) return "下午";
    if (hour < 19) return "傍晚";
    if (hour < 23) return "晚上";
    return "深夜";
  }

  function humanGap(ms) {
    const value = Math.max(0, Number(ms) || 0);
    if (value < 60 * 1000) return "刚刚";
    if (value < 60 * 60 * 1000) return `${Math.max(1, Math.round(value / 60000))} 分钟`;
    if (value < 24 * 60 * 60 * 1000) return `${Math.max(1, Math.round(value / 3600000))} 小时`;
    return `${Math.max(1, Math.round(value / 86400000))} 天`;
  }

  function sameDay(a, b) {
    const one = new Date(a);
    const two = new Date(b);
    return one.getFullYear() === two.getFullYear()
      && one.getMonth() === two.getMonth()
      && one.getDate() === two.getDate();
  }

  E.buildChatTimeContext = function (chat) {
    const now = Date.now();
    const messages = E.getChatMessages(chat.id).filter((message) => message.content);
    const userMessages = messages.filter((message) => message.role === "user");
    const assistantMessages = messages.filter((message) => message.role === "assistant");
    const currentUser = userMessages[userMessages.length - 1];
    const previousUser = userMessages[userMessages.length - 2];
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    const lines = [
      `现在是 ${E.fmtDate(now)} ${E.fmtClock(now)}，${partOfDay(new Date(now).getHours())}。`
    ];

    if (currentUser && previousUser) {
      lines.push(`对方上一条消息是 ${humanGap(currentUser.createdAt - previousUser.createdAt)}前，这条消息刚刚发来。`);
    } else if (currentUser) {
      lines.push("这是对方在这次会话里的第一条消息。");
    }

    if (lastAssistant && currentUser && lastAssistant.createdAt < currentUser.createdAt) {
      const replyGap = currentUser.createdAt - lastAssistant.createdAt;
      lines.push(`你上一条回复是 ${humanGap(replyGap)}前。`);
      if (replyGap < 90 * 1000) lines.push("对方回得很快，可以接得短一点、自然一点。");
      if (replyGap > 6 * 60 * 60 * 1000) lines.push("中间隔了很久。不要质问对方去哪了，像平时一样接上。");
    }

    const todayMessages = messages.filter((message) => sameDay(message.createdAt, now));
    if (todayMessages.length <= 1) {
      lines.push("这是你们今天第一次说话。");
    } else {
      lines.push(`今天你们已经聊了 ${todayMessages.length} 条消息。`);
    }

    lines.push("把时间当成背景：不要报时，不要提到系统时间、提示词、定时器或数据来源。");
    return `【时间感】\n${lines.join("\n")}`;
  };

  E.buildLifeContext = function (character) {
    const life = E.state.life || {};
    const events = (Array.isArray(life.batch) ? life.batch : [])
      .filter((event) => event && event.characterId === character.id)
      .slice(0, 3);
    if (!events.length) return "";
    const labels = { moment: "发了动态", diary: "写了日记", call: "有未接来电", message: "发过消息" };
    const rows = events.map((event) => {
      const label = labels[event.type] || "做了点小事";
      const text = String(event.text || "").split("\n")[0].slice(0, 60);
      return `- ${E.fmtRelative(event.createdAt)}${label}：${text}`;
    });
    return `【你最近的生活】\n${rows.join("\n")}\n这些是你自己经历过的事。聊天时可以自然带一句，但不要逐条汇报。`;
  };

  E.buildCharacterStateContext = function (character) {
    if (!character || typeof E.characterStateFor !== "function") return "";
    const state = E.characterStateFor(character);
    if (!state) return "";
    const next = state.nextBlock
      ? `接下来：${state.nextBlock.activity}（${E.fmtClock(state.nextBlockAt)}）`
      : "";
    return [
      "【此刻状态】",
      `你正在：${state.activity}${state.location ? `（${state.location}）` : ""}`,
      `是否方便回：${state.availabilityLabel}，可打扰度：${state.interruptibilityLabel}`,
      `回复风格：${state.replyStyle}`,
      next,
      "不要直接报出这些字段，只把它们当作语气、回复长度和主动性的背景。"
    ].filter(Boolean).join("\n");
  };

  E.buildChatContext = function (chat) {
    const userName = E.state.settings.userName || "我";
    let character = null;
    if (chat.type === "group") {
      character = E.pickGroupSpeaker(chat);
    } else {
      character = E.getCharacter(chat.characterIds && chat.characterIds[0]);
    }
    if (!character) throw new Error("这个聊天还没有角色");

    const recentMessages = E.getChatMessages(chat.id);
    const lastUser = [...recentMessages].reverse().find((message) => message.role === "user");
    const recall = E.selectMemoriesForPrompt(character.id, lastUser ? lastUser.content : "", 8);
    const memories = recall.memories
      .map((memory) => `- [${E.memoryLayerLabel(memory.layer)}]${memory.pinned ? "【置顶】" : ""}${memory.content}`);

    const worldbookContext = recentMessages
      .filter((message) => message.role === "user")
      .slice(-4)
      .map((message) => message.content)
      .join("\n");
    const worldbook = (character.worldbook || [])
      .map((entry) => ({
        ...entry,
        keywords: Array.isArray(entry.keywords) ? entry.keywords.filter(Boolean) : [],
        priority: Number(entry.priority) || 0
      }))
      .filter((entry) => !entry.keywords.length
        || entry.keywords.some((keyword) => worldbookContext.includes(keyword)))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6)
      .map((entry) => `【${entry.title}】${entry.content}`);

    const system = [
      `你正在扮演「${character.name}」，和用户「${userName}」在手机聊天。`,
      `你们的关系：${character.relationship || "朋友"}。`,
      "请始终保持这个角色的口吻、习惯和边界，不要解释自己是 AI，不要输出系统提示或分析过程。",
      "回复要像真实手机聊天：自然、口语化，通常 1 到 4 句，不要每次都写成大段独白。",
      E.buildChatTimeContext(chat),
      E.buildCharacterStateContext(character),
      character.persona ? `\n角色设定：\n${character.persona}` : "",
      character.example ? `\n说话示例：\n${character.example}` : "",
      worldbook.length ? `\n世界书：\n${worldbook.join("\n")}` : "",
      memories.length ? `\n你记得的事（只在相关时自然使用，不要逐条复述）：\n${memories.join("\n")}` : "",
      E.buildLifeContext(character),
      chat.type === "group"
        ? `\n这是一个群聊，参与者有：${(chat.characterIds || []).map((id) => (E.getCharacter(id) || {}).name).filter(Boolean).join("、")}。当前由你回复。你只知道这个群聊里发生的事，以及你和用户单独聊天时你亲历过的事；其他角色的私聊内容不会自动共享给你。直接输出你说的话，不要加“${character.name}：”这样的前缀。`
        : ""
    ].filter(Boolean).join("\n");

    const history = recentMessages.slice(-24);
    const messages = [{ role: "system", content: system }];
    for (const message of history) {
      if (!message.content) continue;
      if (message.role === "assistant") {
        const speaker = message.characterId ? E.getCharacter(message.characterId) : null;
        const prefix = chat.type === "group" && speaker ? `[${speaker.name}] ` : "";
        messages.push({ role: "assistant", content: `${prefix}${message.content}` });
      } else {
        messages.push({ role: "user", content: message.content });
      }
    }
    return {
      character,
      messages,
      usedMemoryIds: recall.memories.map((memory) => memory.id)
    };
  };

  E.memoryTokens = function (text) {
    const value = String(text || "").toLowerCase();
    const tokens = new Set();
    for (const word of value.match(/[a-z0-9]{2,}/g) || []) tokens.add(word);
    const cjk = value.replace(/[^\u4e00-\u9fa5]/g, "");
    for (let index = 0; index < cjk.length - 1; index += 1) {
      tokens.add(cjk.slice(index, index + 2));
    }
    return tokens;
  };

  E.MEMORY_LAYERS = {
    fact: { label: "事实", boost: 1 },
    preference: { label: "偏好", boost: 1.1 },
    episode: { label: "共同经历", boost: 1.2 },
    relationship: { label: "关系", boost: 1.35 },
    summary: { label: "阶段总结", boost: 1.45 }
  };

  E.inferMemoryLayer = function (content) {
    const value = String(content || "");
    if (/约定|答应|第一次|吵架|和好|纪念日|称呼|叫我|昵称|关系|表白|喜欢你|爱你/.test(value)) return "relationship";
    if (/总结|这段时间|一直以来|总体|阶段|最近一段时间/.test(value)) return "summary";
    if (/喜欢|讨厌|不喜欢|害怕|习惯|口味|偏爱|爱吃|爱喝|受不了|反感/.test(value)) return "preference";
    if (/最近|今天|昨天|那天|上次|去了|发生|开始|结束|见面|一起|出差|旅行|搬家|加班/.test(value)) return "episode";
    return "fact";
  };

  E.normalizeMemoryLayer = function (layer, content) {
    const raw = String(layer || "").trim().toLowerCase();
    const aliases = {
      fact: "fact",
      user_fact: "fact",
      userfact: "fact",
      profile: "fact",
      preference: "preference",
      like: "preference",
      event: "episode",
      episode: "episode",
      experience: "episode",
      relationship: "relationship",
      relationship_rule: "relationship",
      promise: "relationship",
      summary: "summary",
      daily_summary: "summary",
      weekly_summary: "summary"
    };
    if (aliases[raw]) return aliases[raw];
    return E.inferMemoryLayer(content);
  };

  E.memoryLayerLabel = function (layer) {
    const item = E.MEMORY_LAYERS[layer] || E.MEMORY_LAYERS.fact;
    return item.label;
  };

  E.inferMemoryTags = function (content) {
    const value = String(content || "");
    const groups = [
      ["睡眠", /睡|失眠|熬夜|早起|梦/],
      ["饮食", /吃|喝|咖啡|茶|酒|辣|甜|口味|餐厅|做饭/],
      ["地点", /住|城市|家|公司|学校|窗|海边|旅行|搬家/],
      ["工作", /工作|上班|加班|同事|项目|客户|老板|职业/],
      ["学习", /学习|考试|学校|专业|书|课程/],
      ["关系", /关系|朋友|家人|恋人|表白|吵架|约定|纪念日/],
      ["情绪", /开心|难过|焦虑|害怕|压力|孤独|委屈|失眠/],
      ["健康", /健康|生病|医院|药|运动|跑步|身体/],
      ["习惯", /习惯|总是|经常|每天|周末/],
      ["计划", /计划|打算|希望|想要|准备|未来/],
      ["宠物", /猫|狗|宠物/],
      ["音乐", /歌|音乐|乐队|演唱会/],
      ["电影", /电影|剧|导演|演员/]
    ];
    return groups.filter(([, pattern]) => pattern.test(value)).map(([tag]) => tag).slice(0, 4);
  };

  E.normalizeMemoryTags = function (tags, content) {
    const rows = Array.isArray(tags) ? tags : [];
    const cleaned = rows
      .map((tag) => String(tag || "").replace(/^#+/, "").trim().slice(0, 6))
      .filter((tag) => tag.length >= 1);
    const inferred = E.inferMemoryTags(content);
    return Array.from(new Set([...cleaned, ...inferred])).slice(0, 4);
  };

  E.computeMemoryDecay = function (memory, now) {
    const item = memory || {};
    if (item.pinned) return 1;
    const created = Number(item.createdAt) || Number(now) || Date.now();
    const lastUsed = Number(item.lastUsedAt) || 0;
    const reference = Math.max(created, lastUsed);
    const ageDays = Math.max(0, ((Number(now) || Date.now()) - reference) / 86400000);
    const importance = E.clamp(Number(item.importance) || 3, 1, 5);
    const halfLifeDays = importance >= 4 ? 90 : importance <= 2 ? 14 : 45;
    return Math.exp((-ageDays * Math.LN2) / halfLifeDays);
  };

  E.shouldRecallMemories = function (query) {
    const gateEnabled = !E.state || !E.state.settings || E.state.settings.memoryRecallGate !== false;
    if (!gateEnabled) return true;
    const value = String(query || "")
      .replace(/\s+/g, " ")
      .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "")
      .trim();
    if (!value) return false;
    if (/^(嗯+|哦+|啊+|好|好的|行|可以|收到|明白|在吗|在不在|早安|晚安|哈哈+|嘿嘿+|嗨|hi|hello|ok)[。！？!?…]*$/i.test(value)) return false;
    if (/记得|上次|之前|以前|曾经|说过|提过|约定|答应|生日|住|叫|喜欢|讨厌|害怕|习惯|工作|项目|第一次|那天|那时候/.test(value)) return true;
    if (/[?？]/.test(value) && value.length >= 8) return true;
    return value.length >= 14;
  };

  E.selectMemoriesForPrompt = function (characterId, query, limit) {
    const text = String(query || "").trim();
    if (!text) {
      return { memories: E.rankMemories(characterId, "", 6), reason: "cold-start" };
    }
    if (!E.shouldRecallMemories(text)) {
      return { memories: [], reason: "low-signal" };
    }
    return { memories: E.rankMemories(characterId, text, limit || 8), reason: "relevant" };
  };

  E.markMemoriesUsed = async function (ids) {
    const wanted = new Set(ids || []);
    if (!wanted.size || !Array.isArray(E.state.memories)) return;
    const now = Date.now();
    const rows = [];
    for (const memory of E.state.memories) {
      if (!wanted.has(memory.id)) continue;
      memory.lastUsedAt = now;
      memory.useCount = (Number(memory.useCount) || 0) + 1;
      rows.push(memory);
    }
    if (!rows.length || !E.db || typeof E.db.bulkPut !== "function") return;
    try {
      await E.db.bulkPut("memories", rows);
    } catch (error) {
      console.warn("记忆使用状态写入失败", error);
    }
  };

  E.mergeMemoryCandidate = function (existing, candidate, now) {
    const old = existing || {};
    const next = candidate || {};
    const updatedAt = Number(now) || Date.now();
    const updated = Object.assign({}, old);
    updated.importance = E.clamp(
      Math.max(Number(old.importance) || 1, Number(next.importance) || 1),
      1,
      5
    );
    updated.layer = E.normalizeMemoryLayer(next.layer, next.content || old.content);
    const scopeRank = { private: 0, group: 1, public: 2 };
    updated.scope = (scopeRank[next.scope] || 0) > (scopeRank[old.scope] || 0)
      ? next.scope
      : old.scope || "private";
    updated.knownBy = Array.from(new Set([
      ...(Array.isArray(old.knownBy) ? old.knownBy : []),
      ...(Array.isArray(next.knownBy) ? next.knownBy : [])
    ]));
    updated.tags = E.normalizeMemoryTags(
      [...(Array.isArray(old.tags) ? old.tags : []), ...(Array.isArray(next.tags) ? next.tags : [])],
      old.content || next.content
    );
    updated.sourceMessageIds = Array.from(new Set([
      ...(Array.isArray(old.sourceMessageIds) ? old.sourceMessageIds : []),
      ...(Array.isArray(next.sourceMessageIds) ? next.sourceMessageIds : [])
    ]));
    updated.updatedAt = updatedAt;
    updated.lastUsedAt = Math.max(Number(old.lastUsedAt) || 0, Number(next.lastUsedAt) || 0);
    return updated;
  };

  E.memoryVisibleTo = function (memory, characterId) {
    if (!memory || !characterId) return false;
    if (memory.scope === "public") return true;
    if (memory.scope === "group"
      && Array.isArray(memory.knownBy)
      && memory.knownBy.includes(characterId)) return true;
    return memory.characterId === characterId;
  };

  E.rankMemories = function (characterId, query, limit) {
    const queryTokens = E.memoryTokens(query);
    const now = Date.now();
    return E.state.memories
      .filter((memory) => E.memoryVisibleTo(memory, characterId)
        && memory.content
        && !["archived", "deleted"].includes(memory.status))
      .map((memory) => {
        const memoryTokens = E.memoryTokens(memory.content);
        let overlap = 0;
        queryTokens.forEach((token) => {
          if (memoryTokens.has(token)) overlap += 1;
        });
        const tagOverlap = (Array.isArray(memory.tags) ? memory.tags : [])
          .filter((tag) => tag && String(query || "").includes(tag)).length;
        const decay = E.computeMemoryDecay(memory, now);
        const layer = E.MEMORY_LAYERS[memory.layer] || E.MEMORY_LAYERS.fact;
        return {
          memory,
          score: (memory.pinned ? 24 : 0)
            + Number(memory.importance || 1) * 3.2
            + overlap * 5
            + tagOverlap * 1.5
            + decay * 4.5
            + layer.boost * 2
            + Math.min(3, (Number(memory.useCount) || 0) * 0.25)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit || 8)
      .map((item) => item.memory);
  };

  E.normalizeMemoryText = function (text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[\s，。！？；、,.!?;:：""''（）()【】[\]<>《》]/g, "");
  };

  E.canonicalMemoryText = function (text) {
    let value = E.normalizeMemoryText(text)
      .replace(/睡得不好|睡眠不好|睡眠质量不好|睡眠质量差|睡不好|失眠/g, "睡眠差")
      .replace(/受不了|讨厌|反感/g, "不喜欢")
      .replace(/偏爱|喜爱/g, "喜欢")
      .replace(/恐惧|害怕|怕/g, "害怕")
      .replace(/(?:用户|本人|自己|我|俺)/g, "")
      .replace(/(?:最近|这几天|这段时间|之前|以前|曾经|说过|提到过|讲过|总是|经常|一直|老是|其实|有点|比较|真的|确实|大概|应该|可能)/g, "")
      .replace(/(?:很|特别|非常|挺|太)/g, "")
      .replace(/(?:的|了|着|过|呢|啊|呀|嘛|哦|嗯)/g, "")
      .replace(/(?:事情|东西)/g, "");
    return value.slice(0, 90);
  };

  E.memorySimilarity = function (left, right) {
    const a = String(left || "");
    const b = String(right || "");
    if (!a || !b) return 0;
    if (a === b) return 1;
    const grams = (value) => {
      const set = new Set();
      for (let index = 0; index < value.length - 1; index += 1) {
        set.add(value.slice(index, index + 2));
      }
      return set;
    };
    const aGrams = grams(a);
    const bGrams = grams(b);
    if (!aGrams.size || !bGrams.size) return 0;
    let overlap = 0;
    aGrams.forEach((gram) => {
      if (bGrams.has(gram)) overlap += 1;
    });
    return (overlap * 2) / (aGrams.size + bGrams.size);
  };

  E.isDuplicateMemory = function (existingKeys, key) {
    return (existingKeys || []).some((oldKey) => {
      if (!oldKey || !key) return false;
      if (oldKey === key) return true;
      const shorter = Math.min(oldKey.length, key.length);
      if (shorter < 3) return false;
      // 旧记忆已经完整覆盖新事实时，不再重复写入。
      if (oldKey.includes(key)) return true;
      // 只差一两个字时也视为同一条，避免“靠窗的位置 / 靠窗位置”反复出现。
      if (key.includes(oldKey) && key.length - oldKey.length <= 1) return true;
      return E.memorySimilarity(oldKey, key) >= 0.86;
    });
  };

  E.cleanMemoryPhrase = function (value) {
    return String(value || "")
      .split(/[，。！？；\n]/)[0]
      .trim()
      .replace(/^[、，。！？；:\s]+|[、，。！？；:\s]+$/g, "")
      .replace(/^(?:其实|真的|就是|大概|应该|可能|总是|经常|一直|老是)+/g, "")
      .replace(/(?:呢|啊|呀|嘛|哦|嗯)+$/g, "")
      .slice(0, 90);
  };

  E.localMemoryCandidates = function (text) {
    const value = String(text || "");
    const rules = [
      { re: /^(?:我|俺)?(?:最近|这几天|这段时间|最近一段时间)(?:总是|经常|一直|老是)?(.{2,45})$/, prefix: "用户最近", importance: 4, layer: "episode" },
      { re: /^(?:我|俺)?(?:很|特别|非常|挺|有点|比较|一直|其实)?不喜欢(.{2,45})$/, prefix: "用户不喜欢", importance: 4, layer: "preference" },
      { re: /^(?:我|俺)?(?:讨厌|受不了|反感)(.{2,45})$/, prefix: "用户不喜欢", importance: 4, layer: "preference" },
      { re: /^(?:我|俺)?(?:很|特别|非常|挺|有点|比较|一直|其实)?喜欢(.{2,45})$/, prefix: "用户喜欢", importance: 4, layer: "preference" },
      { re: /^(?:我|俺)?(?:害怕|怕|恐惧)(.{2,45})$/, prefix: "用户害怕", importance: 4, layer: "preference" },
      { re: /^(?:我|俺)?叫(.{1,24})$/, prefix: "用户叫", importance: 5, layer: "fact" },
      { re: /^(?:我|俺)?住在(.{2,40})$/, prefix: "用户住在", importance: 5, layer: "fact" },
      { re: /^(?:我|俺)?(?:的)?生日(?:是)?(.{2,30})$/, prefix: "用户生日", importance: 5, layer: "fact" },
      { re: /^(?:我|俺)?(?:希望|想要|打算)(.{2,45})$/, prefix: "用户希望", importance: 3, layer: "fact" },
      { re: /^(?:我|俺)?(?:习惯|总是|经常)(.{2,45})$/, prefix: "用户习惯", importance: 3, layer: "preference" }
    ];
    const found = [];
    const seen = new Set();
    const ignored = new Set(["你", "他", "她", "它", "这个", "那个", "什么", "怎么", "这样", "那样"]);
    const clauses = value
      .split(/[，。！？；\n]+/)
      .map((clause) => clause.trim().replace(/^(?:嗯|其实|而且|不过|但是|然后|还有|对了|说起来|我觉得|我感觉)+/g, "").trim())
      .filter(Boolean);
    for (const clause of clauses) {
      for (const rule of rules) {
        const match = clause.match(rule.re);
        if (!match) continue;
        const phrase = E.cleanMemoryPhrase(match[1]);
        if (!phrase || phrase.length < 2 || ignored.has(phrase)) continue;
        const content = `${rule.prefix}${phrase}`.slice(0, 120);
        const key = E.canonicalMemoryText(content);
        if (!key || E.isDuplicateMemory(Array.from(seen), key)) continue;
        seen.add(key);
        found.push({
          content,
          importance: rule.importance,
          layer: rule.layer,
          tags: E.inferMemoryTags(content)
        });
        break;
      }
    }
    return found.slice(0, 3);
  };

  E.parseMemoryExtraction = function (text) {
    let raw = String(text || "").trim();
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return [];
    }
    if (!parsed) return [];
    if (!Array.isArray(parsed)) parsed = Array.isArray(parsed.memories) ? parsed.memories : [];
    return parsed
      .map((item) => {
        const value = typeof item === "string" ? { content: item } : (item || {});
        const content = String(value.content || value.memory || "").trim().slice(0, 120);
        return {
          content,
          importance: E.clamp(Number(value.importance) || 3, 1, 5),
          layer: E.normalizeMemoryLayer(value.layer || value.memoryLayer, content),
          tags: E.normalizeMemoryTags(value.tags, content)
        };
      })
      .filter((item) => item.content.length >= 3)
      .slice(0, 5);
  };

  E.extractMemoryCandidates = async function (character, messages, options) {
    const opts = options || {};
    const userMessages = messages.filter((message) => message.role === "user");
    const lastUser = userMessages[userMessages.length - 1];
    const localText = opts.force
      ? userMessages.slice(-6).map((message) => message.content).join("\n")
      : (lastUser ? lastUser.content : "");
    const local = opts.local && opts.local.length ? opts.local : E.localMemoryCandidates(localText);
    const providerId = E.activeProvider();
    const provider = E.PROVIDERS[providerId] || E.PROVIDERS.demo;
    const config = E.getProviderConfig(providerId);
    if (provider.kind === "demo" || (provider.needsKey && !config.apiKey)) return local;

    const transcriptMessages = opts.force ? messages.slice(-10) : messages.slice(-6);
    const transcript = transcriptMessages
      .filter((message) => message.content)
      .map((message) => {
        const speaker = message.role === "user" ? "用户" : character.name;
        return `${speaker}：${message.content}`;
      })
      .join("\n");
    const known = E.rankMemories(character.id, "", 12)
      .map((memory) => `- ${memory.content}`)
      .join("\n");
    const system = [
      "你是长期记忆整理器，只负责从对话中提取用户明确说过的长期事实。",
      "只记录：稳定偏好、个人事实、重要计划、反复出现的感受、关系信息。",
      "不要记录一次性寒暄、角色自己编造的内容、猜测、临时情绪、敏感凭据或 API Key。",
      `角色名：${character.name}。`,
      "优先提取最近一条用户消息里的新事实；已有记忆不要重复输出。",
      known ? `已有记忆：\n${known}` : "",
      "layer 只能是 fact / preference / episode / relationship / summary 之一。",
      "只输出 JSON 数组，不要输出解释或 Markdown。",
      '格式：[{"content":"用户喜欢...","importance":1-5,"layer":"preference"}]，最多 5 条。',
      "如果没有值得长期记住的内容，输出 []。"
    ].filter(Boolean).join("\n");
    try {
      const result = await E.chatComplete([
        { role: "system", content: system },
        { role: "user", content: transcript || "（没有新对话）" }
      ], { stream: false, temperature: 0.1, maxTokens: 420 });
      const parsed = E.parseMemoryExtraction(result);
      return parsed.length ? parsed : local;
    } catch (error) {
      console.warn("自动记忆提炼失败，使用本地规则", error);
      return local;
    }
  };

  E.saveExtractedMemories = async function (characterId, candidates, chat, sourceMessages) {
    const existing = E.state.memories.filter((memory) => E.memoryVisibleTo(memory, characterId));
    const scope = chat && chat.type === "group" ? "group" : "private";
    const knownBy = scope === "group"
      ? (chat.characterIds || []).map(String).filter(Boolean)
      : [characterId];
    const added = [];
    const merged = [];
    for (const candidate of candidates || []) {
      const content = String(candidate.content || "").trim().slice(0, 160);
      const key = E.canonicalMemoryText(content);
      if (!key || key.length < 3) continue;
      const layer = E.normalizeMemoryLayer(candidate.layer, content);
      const tags = E.normalizeMemoryTags(candidate.tags, content);
      const duplicate = existing.find((memory) => E.isDuplicateMemory([E.canonicalMemoryText(memory.content)], key));
      if (duplicate) {
        const next = E.mergeMemoryCandidate(duplicate, {
          content,
          importance: candidate.importance,
          layer,
          tags,
          scope,
          knownBy,
          sourceMessageIds: (sourceMessages || []).map((message) => message.id).filter(Boolean),
          lastUsedAt: Date.now()
        }, Date.now());
        Object.assign(duplicate, next);
        merged.push(duplicate);
        if (added.length + merged.length >= 3) break;
        continue;
      }
      const memory = E.normalizeMemory({
        id: E.uid("mem"),
        characterId,
        content,
        importance: candidate.importance,
        source: "auto",
        scope,
        knownBy,
        layer,
        tags,
        sourceChatId: chat ? chat.id : "",
        sourceMessageIds: (sourceMessages || []).map((message) => message.id).filter(Boolean),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      existing.push(memory);
      added.push(memory);
      if (added.length + merged.length >= 3) break;
    }
    if (added.length) E.state.memories.push(...added);
    const changed = [...added, ...merged];
    if (changed.length) {
      await E.db.bulkPut("memories", changed);
    }
    return { added, merged };
  };

  E.maybeExtractMemories = async function (chat, characterId, userText, assistantText, options) {
    const opts = options || {};
    const empty = { added: [], merged: [] };
    if (!chat || !characterId || (!E.state.settings.autoMemory && !opts.force)) return empty;
    const character = E.getCharacter(characterId);
    if (!character) return empty;
    const messages = E.getChatMessages(chat.id).slice(-10);
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    const text = String(userText || (lastUser ? lastUser.content : ""));
    const local = E.localMemoryCandidates(text);
    const providerId = E.activeProvider();
    const provider = E.PROVIDERS[providerId] || E.PROVIDERS.demo;
    const userCount = messages.filter((message) => message.role === "user").length;
    const shouldScan = opts.force
      || local.length > 0
      || /记住|别忘|记一下|帮我记/.test(text)
      || (provider.kind !== "demo" && userCount > 0 && userCount % 8 === 0);
    if (!shouldScan) return empty;
    const jobKey = `${chat.id}:${characterId}`;
    if (E.state.memoryExtracting[jobKey]) return empty;
    E.state.memoryExtracting[jobKey] = true;
    try {
      const candidates = await E.extractMemoryCandidates(character, messages, { local, force: opts.force });
      const result = await E.saveExtractedMemories(characterId, candidates, chat, messages);
      const changed = result.added.length + result.merged.length;
      if (changed) {
        E.toast(`${character.name} 的记忆更新了 ${changed} 条`, 2600);
        const route = E.parseRoute();
        if (route.name === "memory" || (route.name === "character" && route.args[0] === characterId)) {
          E.renderRoute();
        }
      }
      return result;
    } finally {
      delete E.state.memoryExtracting[jobKey];
    }
  };

  E.demoReply = function (character, userText) {
    const name = character ? character.name : "她";
    const text = String(userText || "");
    const seed = text.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const pools = [
      [
        "嗯，我在。你慢慢说。",
        "听起来今天不太轻松。先别急着把它解决掉。",
        "那就先坐一会儿。窗外的天色怎么样？",
        "我记住了。你不用马上回答我。"
      ],
      [
        "你这句话，我可以想一会儿。",
        "好。那我不问原因，只问你现在想不想喝点热的。",
        "有点意外，但也不算太意外。",
        "我在听。你继续。"
      ],
      [
        "先别把话说满。",
        "嗯。那明天呢？",
        "你每次说“没事”的时候，听起来都不太像没事。",
        "我不催你。想到再说。"
      ]
    ];
    const pool = pools[seed % pools.length];
    const line = pool[seed % pool.length];
    if (name === "阿梨") return `${line} 对了，我刚刚听到一首很适合现在的歌。`;
    if (name === "周叙") return `${line} 我刚好也在想这件事。`;
    return line;
  };

  E.simulateStream = async function (text, onDelta, signal) {
    const chars = Array.from(String(text || ""));
    let buffer = "";
    for (let i = 0; i < chars.length; i++) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      buffer += chars[i];
      if (onDelta) onDelta(chars[i]);
      if (i % 2 === 0) await E.sleep(14);
    }
    return buffer;
  };

  E.splitChatReply = function (text, options) {
    const opts = options || {};
    const maxSegments = Math.max(1, Number(opts.maxSegments) || 4);
    const raw = String(text || "").replace(/\r\n?/g, "\n").trim();
    if (!raw) return [];
    if (raw.includes("```")) return [raw];

    const splitByLength = (value, limit) => {
      const chars = Array.from(String(value || ""));
      const size = Math.max(24, Number(limit) || 88);
      if (chars.length <= size) return [String(value || "")];
      const chunks = [];
      let start = 0;
      while (start < chars.length) {
        let end = Math.min(chars.length, start + size);
        if (end < chars.length) {
          const windowStart = Math.max(start + Math.floor(size * 0.55), end - 24);
          for (let index = end - 1; index >= windowStart; index -= 1) {
            if (/[。！？!?…；;，,、：:\s]/.test(chars[index])) {
              end = index + 1;
              break;
            }
          }
        }
        const piece = chars.slice(start, end).join("").trim();
        if (piece) chunks.push(piece);
        start = end;
      }
      return chunks.length ? chunks : [String(value || "")];
    };

    const splitSentences = (value) => {
      const sentences = value.match(/[^。！？!?…\n]+[。！？!?…]+|[^。！？!?…\n]+$/g) || [value];
      const chunks = [];
      let current = "";
      for (const sentence of sentences) {
        const piece = sentence.trim();
        if (!piece) continue;
        if (current && current.length + piece.length > 96) {
          chunks.push(current);
          current = piece;
        } else {
          current += piece;
        }
      }
      if (current) chunks.push(current);
      return chunks.flatMap((chunk) => splitByLength(chunk, 96));
    };

    const pieces = [];
    const paragraphs = raw.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
    for (const paragraph of paragraphs) {
      const lines = paragraph.split(/\n/).map((line) => line.trim()).filter(Boolean);
      for (const line of lines) {
        if (line.length <= 56) pieces.push(...splitByLength(line, 56));
        else pieces.push(...splitSentences(line));
      }
    }
    if (!pieces.length) pieces.push(raw);

    const cleaned = [];
    for (const piece of pieces) {
      const value = piece.trim();
      if (!value) continue;
      if (/^[，。！？!?…、；;：:]+$/.test(value) && cleaned.length) {
        cleaned[cleaned.length - 1] += value;
        continue;
      }
      cleaned.push(value);
    }
    if (cleaned.length > maxSegments) {
      const head = cleaned.slice(0, maxSegments - 1);
      const tail = cleaned.slice(maxSegments - 1).join("\n");
      return [...head, tail].filter(Boolean);
    }
    return cleaned;
  };

  E.chatSegmentDelay = function (segment, index) {
    const value = String(segment || "");
    const length = Array.from(value).length;
    const base = Math.min(2200, Math.max(650, length * 42));
    const punctuationPause = /[？?！!…]$/.test(value) ? 180 : /[，,、；;：:]$/.test(value) ? 80 : 0;
    const jitter = 90 + Math.floor(Math.random() * 260);
    return Math.min(3000, base + punctuationPause + jitter + (Number(index) || 0) * 80);
  };

  E.generateChatReply = async function (chat, onDelta, signal) {
    const providerId = E.activeProvider();
    const provider = E.PROVIDERS[providerId] || E.PROVIDERS.demo;
    const context = E.buildChatContext(chat);
    if (context.usedMemoryIds && context.usedMemoryIds.length) {
      void E.markMemoriesUsed(context.usedMemoryIds);
    }
    if (provider.kind === "demo") {
      const messages = E.getChatMessages(chat.id);
      const lastUser = [...messages].reverse().find((message) => message.role === "user");
      const text = E.demoReply(context.character, lastUser ? lastUser.content : "");
      await E.simulateStream(text, onDelta, signal);
      return { text, characterId: context.character.id };
    }
    const text = await E.chatComplete(context.messages, {
      stream: true,
      onDelta,
      signal,
      temperature: 0.85,
      maxTokens: 2048
    });
    return { text, characterId: context.character.id };
  };

  E.generateMoment = async function (character) {
    const providerId = E.activeProvider();
    const provider = E.PROVIDERS[providerId] || E.PROVIDERS.demo;
    if (provider.kind === "demo") {
      const lines = [
        "今天的光很慢。\n路过一家店，想起你说过喜欢靠窗的位置。",
        "有些话不适合在聊天框里说，\n所以放在这里。",
        "刚刚听到一首歌，\n前奏很像某个下午。",
        "今天没有发生什么。\n但也不是什么都没有。"
      ];
      return lines[Math.floor(Math.random() * lines.length)];
    }
    const system = `你是「${character.name}」。请以这个角色的口吻写一条手机朋友圈动态。\n角色设定：${character.persona}\n关系：${character.relationship}\n只输出动态正文，不要解释，不要加引号，不要写“朋友圈：”。`;
    const text = await E.chatComplete([
      { role: "system", content: system },
      { role: "user", content: "写一条今天的动态。控制在 1 到 3 句话，留一点余味。" }
    ], { stream: false, temperature: 0.9, maxTokens: 300 });
    return String(text || "").trim();
  };

  E.generateCallLine = async function (character, contextText) {
    const providerId = E.activeProvider();
    const provider = E.PROVIDERS[providerId] || E.PROVIDERS.demo;
    if (provider.kind === "demo") {
      return `喂？${contextText ? "我刚看到你的消息。" : "怎么突然打电话？"} 我在。`;
    }
    const system = `你是「${character.name}」，正在接电话。角色设定：${character.persona}\n关系：${character.relationship}\n请用自然口语说一句接电话的话，控制在 1 到 2 句。`;
    const text = await E.chatComplete([
      { role: "system", content: system },
      { role: "user", content: contextText || "（电话接通了）" }
    ], { stream: false, temperature: 0.85, maxTokens: 160 });
    return String(text || "").trim();
  };

  E.testProvider = async function () {
    const providerId = E.activeProvider();
    const provider = E.PROVIDERS[providerId] || E.PROVIDERS.demo;
    if (provider.kind === "demo") return "演示模式可用";
    const text = await E.chatComplete([
      { role: "system", content: "你是连接测试助手。" },
      { role: "user", content: "只回复 OK，不要加任何其它内容。" }
    ], { stream: false, temperature: 0, maxTokens: 16 });
    return String(text || "").trim();
  };
})();
