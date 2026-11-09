(function () {
  "use strict";

  const E = window.Ember;
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  E.PROACTIVE_PACES = {
    quiet: {
      label: "安静",
      description: "大约 4–8 小时一次，每天最多 1 次",
      minGapMs: 4 * HOUR,
      maxGapMs: 8 * HOUR,
      dailyCap: 1
    },
    normal: {
      label: "正常",
      description: "大约 1.5–3 小时一次，每天最多 3 次",
      minGapMs: 90 * MINUTE,
      maxGapMs: 3 * HOUR,
      dailyCap: 3
    },
    lively: {
      label: "热闹",
      description: "大约 30–90 分钟一次，每天最多 5 次",
      minGapMs: 30 * MINUTE,
      maxGapMs: 90 * MINUTE,
      dailyCap: 5
    }
  };

  const REASON_LABELS = {
    silence: "安静了一阵",
    memory: "想起了你说过的事",
    promise: "记着之前的约定",
    commitment: "有一件约定快到了",
    repair: "有一句话还没聊开",
    event: "刚发生了一件小事",
    care: "想知道你今天怎么样"
  };

  const SUPPRESS_LABELS = {
    "not-due": "还没到时间",
    "quiet-hours": "勿扰时段",
    "low-interruptibility": "她现在不方便被打扰",
    "recent-user": "你刚说过话",
    cooldown: "距离上次主动还不够久",
    "daily-cap": "今天主动次数已经用完",
    disabled: "主动消息已关闭",
    expired: "这条意图已经过期",
    "missing-character": "角色不存在",
    "sending": "正在发送"
  };

  let lastLifeRef = null;
  let activeTick = null;

  function dayKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function pick(list, seed) {
    if (!Array.isArray(list) || !list.length) return "";
    return list[hashString(seed) % list.length];
  }

  function lifeState() {
    if (lastLifeRef !== E.state.life) {
      E.state.life = E.normalizeLifeState(E.state.life);
      lastLifeRef = E.state.life;
    }
    return E.state.life;
  }

  function modeFor(character) {
    return character && character.proactiveMode ? character.proactiveMode : "inherit";
  }

  function paceFor(character) {
    const mode = modeFor(character);
    if (mode === "off") return null;
    const paceId = mode === "inherit" ? (E.state.settings.proactivePace || "normal") : mode;
    return E.PROACTIVE_PACES[paceId] || E.PROACTIVE_PACES.normal;
  }

  function enabled(character) {
    return !!character
      && E.state.settings.proactiveEnabled !== false
      && modeFor(character) !== "off";
  }

  function proactiveRecord(characterId, now) {
    const life = lifeState();
    const key = dayKey(now);
    let record = life.proactive[characterId];
    if (!record) {
      record = {
        dayKey: key,
        count: 0,
        lastSentAt: 0,
        lastReason: "",
        lastSuppressedBy: "",
        lastEvaluatedAt: 0,
        nextEligibleAt: 0
      };
    }
    if (record.dayKey !== key) {
      record.dayKey = key;
      record.count = 0;
    }
    life.proactive[characterId] = record;
    return record;
  }

  function directChatFor(characterId) {
    return E.state.chats.find((chat) => chat.type === "direct"
      && Array.isArray(chat.characterIds)
      && chat.characterIds[0] === characterId) || null;
  }

  function lastUserMessageAt(characterId) {
    const chat = directChatFor(characterId);
    if (!chat) return 0;
    const messages = E.state.messages.filter((message) => message.chatId === chat.id && message.role === "user");
    return messages.reduce((latest, message) => Math.max(latest, Number(message.createdAt) || 0), 0);
  }

  function lastLifeEvent(characterId) {
    const life = lifeState();
    return (life.batch || [])
      .filter((event) => event.characterId === characterId)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0] || null;
  }

  function hasPromiseMemory(characterId) {
    return E.state.memories.some((memory) => memory.characterId === characterId
      && memory.layer === "relationship"
      && /约定|答应|承诺|说好|下次|以后/.test(memory.content || ""));
  }

  function chooseReason(character, now) {
    if (typeof E.commitmentEngine !== "undefined" && E.commitmentEngine.dueIntent(character.id, now)) {
      return "commitment";
    }
    if (typeof E.relationshipEngine !== "undefined" && E.relationshipEngine.needsRepair(character, now)) {
      return "repair";
    }
    const event = lastLifeEvent(character.id);
    if (event && now - Number(event.createdAt) < 6 * HOUR) return "event";
    if (hasPromiseMemory(character.id)) return "promise";
    const lastUser = lastUserMessageAt(character.id);
    if (lastUser && now - lastUser > 6 * HOUR) return "silence";
    return "care";
  }

  function pendingIntentFor(characterId) {
    const life = lifeState();
    return life.intents.find((intent) => intent.characterId === characterId
      && ["pending", "sending"].includes(intent.status)) || null;
  }

  function tomorrowStart(timestamp) {
    const date = new Date(timestamp);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 5, 0, 0);
    return target.getTime();
  }

  function clockMinutes(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function dndEndAt(timestamp) {
    const settings = E.state.settings;
    const dnd = { enabled: !!settings.dndEnabled, start: settings.dndStart, end: settings.dndEnd };
    if (!E.lifeEngine.inDndWindow(timestamp, dnd)) return 0;
    const start = clockMinutes(dnd.start);
    const end = clockMinutes(dnd.end);
    if (start === null || end === null || start === end) return 0;
    const date = new Date(timestamp);
    const current = date.getHours() * 60 + date.getMinutes();
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    target.setMinutes(end);
    if (start < end) {
      if (current >= start && current < end) return target.getTime();
    } else if (current >= start) {
      target.setDate(target.getDate() + 1);
      return target.getTime();
    } else if (current < end) {
      return target.getTime();
    }
    return 0;
  }

  function ensureIntent(character, now) {
    if (!enabled(character)) return null;
    const existing = pendingIntentFor(character.id);
    if (existing) return existing;
    const life = lifeState();
    const pace = paceFor(character);
    if (!pace) return null;
    const record = proactiveRecord(character.id, now);
    const state = E.characterStateFor(character, now);
    const reason = chooseReason(character, now);
    const commitment = reason === "commitment" && typeof E.commitmentEngine !== "undefined"
      ? E.commitmentEngine.dueIntent(character.id, now)
      : null;
    const baseGap = pace.minGapMs + Math.floor(Math.random() * Math.max(1, pace.maxGapMs - pace.minGapMs));
    const randomGap = typeof E.relationshipEngine !== "undefined"
      ? E.relationshipEngine.adjustGap(baseGap, character)
      : baseGap;
    const normalDueAt = Math.max(
      now + 5 * MINUTE,
      record.lastSentAt ? record.lastSentAt + pace.minGapMs : 0,
      state && !state.canInterrupt && state.nextAvailableAt ? state.nextAvailableAt : 0,
      now + randomGap
    );
    const dueAt = commitment
      ? Math.max(
        now + 5 * MINUTE,
        record.lastSentAt ? record.lastSentAt + pace.minGapMs : 0,
        state && !state.canInterrupt && state.nextAvailableAt ? state.nextAvailableAt : 0,
        Math.min(normalDueAt, Number(commitment.dueAt) - 2 * HOUR)
      )
      : normalDueAt;
    const intent = E.normalizeProactiveIntent({
      id: E.uid("intent"),
      characterId: character.id,
      dueAt,
      reason,
      urgency: E.clamp(0.35 + (reason === "promise" ? 0.25 : reason === "event" ? 0.15 : 0), 0, 1),
      expiresAt: dueAt + 2 * HOUR,
      channel: "chat",
      status: "pending",
      sourceEventId: lastLifeEvent(character.id)
        ? (lastLifeEvent(character.id).sourceEventId || lastLifeEvent(character.id).id)
        : "",
      sourceCommitmentId: commitment ? commitment.id : "",
      createdAt: now
    });
    life.intents = (life.intents || []).concat(intent).slice(-24);
    return intent;
  }

  function scoreIntent(intent, state, record, now) {
    const lastUser = lastUserMessageAt(intent.characterId);
    const silenceMs = lastUser ? now - lastUser : now - (Number(intent.createdAt) || now);
    const silencePressure = E.clamp(silenceMs / (6 * HOUR), 0, 1) * 0.25;
    const timeFit = state && state.canInterrupt ? 0.22 : -0.25;
    const urgency = Number(intent.urgency) || 0.35;
    const recentPenalty = lastUser && now - lastUser < 45 * MINUTE ? 0.18 : 0;
    const capPenalty = record ? (record.count / 5) * 0.12 : 0;
    return E.clamp(0.38 + urgency * 0.3 + silencePressure + timeFit - recentPenalty - capPenalty, 0, 1);
  }

  function evaluateIntent(intent, now) {
    if (!intent) return { allowed: false, suppressedBy: "expired", nextEligibleAt: 0, score: 0 };
    if (!["pending", "sending"].includes(intent.status)) {
      return { allowed: false, suppressedBy: intent.status, nextEligibleAt: 0, score: 0 };
    }
    const character = E.getCharacter(intent.characterId);
    if (!character) return { allowed: false, suppressedBy: "missing-character", nextEligibleAt: 0, score: 0 };
    if (!enabled(character)) return { allowed: false, suppressedBy: "disabled", nextEligibleAt: 0, score: 0 };
    if (Number(intent.dueAt) > now) {
      return { allowed: false, suppressedBy: "not-due", nextEligibleAt: Number(intent.dueAt), score: 0 };
    }
    if (Number(intent.expiresAt) && Number(intent.expiresAt) <= now) {
      return { allowed: false, suppressedBy: "expired", nextEligibleAt: 0, score: 0 };
    }
    const dndEnd = dndEndAt(now);
    if (dndEnd) return { allowed: false, suppressedBy: "quiet-hours", nextEligibleAt: dndEnd, score: 0 };

    const state = E.characterStateFor(character, now);
    if (!state || !state.canInterrupt) {
      return {
        allowed: false,
        suppressedBy: "low-interruptibility",
        nextEligibleAt: state ? state.nextAvailableAt : now + 30 * MINUTE,
        score: 0,
        state
      };
    }

    const lastUser = lastUserMessageAt(character.id);
    if (lastUser && now - lastUser < 20 * MINUTE) {
      return {
        allowed: false,
        suppressedBy: "recent-user",
        nextEligibleAt: lastUser + 20 * MINUTE,
        score: 0,
        state
      };
    }

    const pace = paceFor(character);
    if (!pace) return { allowed: false, suppressedBy: "disabled", nextEligibleAt: 0, score: 0, state };
    const record = proactiveRecord(character.id, now);
    if (record.count >= pace.dailyCap) {
      return {
        allowed: false,
        suppressedBy: "daily-cap",
        nextEligibleAt: tomorrowStart(now),
        score: 0,
        state,
        record
      };
    }
    if (record.lastSentAt && now - record.lastSentAt < pace.minGapMs) {
      return {
        allowed: false,
        suppressedBy: "cooldown",
        nextEligibleAt: record.lastSentAt + pace.minGapMs,
        score: 0,
        state,
        record
      };
    }

    return {
      allowed: true,
      suppressedBy: "",
      nextEligibleAt: 0,
      score: scoreIntent(intent, state, record, now),
      state,
      record
    };
  }

  function localMessage(character, state, intent) {
    const reason = intent.reason || "care";
    const lines = {
      silence: [
        "安静了一阵，忽然想问你一句。",
        "刚刚空下来，想起你之前说的话。",
        "没什么事，就是想看看你在不在。"
      ],
      memory: [
        "突然想起你上次说的那件事。后来怎么样了？",
        "今天有一瞬间想起你，顺手就想给你发条消息。"
      ],
      promise: [
        "我记着你之前答应过的事。别装忘。",
        "突然想起我们说过的那件事，等你空下来再说。"
      ],
      commitment: [
        "之前说好的事，你还记得吗？不急，我只是先问一句。",
        "快到我们约好的时间了。你那边方便吗？",
        "我把那件事记在手机里了。别到时候只有我一个人记得。"
      ],
      repair: [
        "刚刚那句话，我想了想，还是想跟你说清楚。",
        "我可能有点在意。不是要你马上解释，只是不想装作没事。",
        "你还在生气吗？如果不方便说，我可以等。"
      ],
      event: [
        `今天${state && state.activity ? state.activity : "忙完"}的时候，遇到一件小事，想跟你说。`,
        "刚刚发生了一件很小的事，第一个想到的是你。",
        "今天有一点不一样，想让你也知道。"
      ],
      care: [
        "今天还好吗？不用急着回。",
        "刚想起你，不知道你今天顺不顺。",
        "在做什么？我这边刚空下来。"
      ]
    };
    if (state && state.availability === "busy") {
      return pick([
        `刚忙完一阵，看到你之前那条。现在才回。`,
        `今天${state.activity}有点久，才空下来。你那边怎么样？`,
        `还在${state.location}，可能回得慢。先跟你说一声。`
      ], `${character.id}:${intent.id}:busy`);
    }
    return pick(lines[reason] || lines.care, `${character.id}:${intent.id}:${reason}`);
  }

  async function generateMessage(character, state, intent) {
    const providerId = E.activeProvider();
    const provider = E.PROVIDERS[providerId] || E.PROVIDERS.demo;
    const useModel = E.state.settings.proactiveUseModel && provider.kind !== "demo" && typeof E.chatComplete === "function";
    if (!useModel) return localMessage(character, state, intent);
    try {
      const chat = directChatFor(character.id);
      const history = chat ? E.getChatMessages(chat.id).slice(-6) : [];
      const transcript = history
        .filter((message) => message.content)
        .map((message) => `${message.role === "user" ? "用户" : character.name}：${message.content}`)
        .join("\n");
      const system = [
        `你是「${character.name}」，正在用手机主动给用户发一条消息。`,
        `角色设定：${character.persona || "一个住在手机里的角色。"}`,
        `你们的关系：${character.relationship || "朋友"}。`,
        `你此刻的状态：${state ? state.statusLine : "刚空下来"}。`,
        `你想联系对方的原因：${REASON_LABELS[intent.reason] || "想起对方"}。`,
        typeof E.relationshipEngine !== "undefined" ? E.relationshipEngine.promptContext(character) : "",
        typeof E.commitmentEngine !== "undefined" ? E.commitmentEngine.promptContext(character) : "",
        "只输出你发出去的那条消息，1 到 2 句，口语化，不要解释，不要加引号，不要写角色名。",
        "如果当前不方便，可以写得短一点，或者说明晚点再聊。"
      ].join("\n");
      const text = await E.chatComplete([
        { role: "system", content: system },
        { role: "user", content: transcript || "（你们有一阵没说话了）" }
      ], { stream: false, temperature: 0.9, maxTokens: 160 });
      const value = String(text || "").trim();
      return value || localMessage(character, state, intent);
    } catch (error) {
      console.warn("主动消息模型生成失败，使用本地模板", error);
      return localMessage(character, state, intent);
    }
  }

  async function sendIntent(intent, now) {
    if (!intent || intent.status === "sent") return null;
    const existing = E.state.messages.find((message) => message.intentId === intent.id);
    if (existing) {
      intent.status = "sent";
      intent.sentAt = Number(existing.createdAt) || now;
      return existing;
    }
    const character = E.getCharacter(intent.characterId);
    if (!character) return null;
    const state = E.characterStateFor(character, now);
    intent.status = "sending";
    await E.saveLifeState();
    const chat = await E.ensureDirectChat(character.id);
    const text = await generateMessage(character, state, intent);
    const message = {
      id: E.uid("msg"),
      chatId: chat.id,
      role: "assistant",
      characterId: character.id,
      content: text,
      createdAt: now,
      source: "proactive",
      intentId: intent.id,
      sourceCommitmentId: intent.sourceCommitmentId || "",
      sourceEventId: intent.sourceEventId || "",
      stateSnapshot: state ? {
        activity: state.activity,
        location: state.location,
        availability: state.availability,
        interruptibility: state.interruptibility
      } : null
    };
    E.state.messages.push(message);
    await E.saveMessage(message);
    chat.unread = (Number(chat.unread) || 0) + 1;
    chat.lastMessageAt = now;
    await E.saveChat(chat);
    await E.addNotification({
      title: character.name,
      body: text.slice(0, 90),
      app: "chat",
      route: `#/chat/${chat.id}`
    });
    intent.status = "sent";
    intent.sentAt = now;
    intent.suppressedBy = "";
    intent.nextEligibleAt = 0;
    const record = proactiveRecord(character.id, now);
    record.count += 1;
    record.lastSentAt = now;
    record.lastReason = intent.reason;
    record.lastSuppressedBy = "";
    record.lastEvaluatedAt = now;
    record.nextEligibleAt = 0;
    await E.saveLifeState();
    if (intent.sourceCommitmentId && typeof E.commitmentEngine !== "undefined") {
      await E.commitmentEngine.markReminded(intent.sourceCommitmentId);
    }
    if (E.state.locked) {
      E.renderLockScreen();
      E.renderStatus();
    } else {
      const route = E.parseRoute();
      if (route.name === "chat" && route.args[0] === chat.id) E.refreshThreadMessages(chat);
      else E.renderStatus();
      E.renderNotificationDrawer();
    }
    return message;
  }

  async function tickInternal(nowValue, options) {
    if (!E.state || !E.state.ready || !E.state.settings) return { sent: null, evaluated: 0 };
    const now = Number(nowValue) || Date.now();
    const onlyCharacterId = options && options.characterId ? String(options.characterId) : "";
    const life = lifeState();
    const characters = (E.state.characters || []).filter((character) => enabled(character)
      && (!onlyCharacterId || character.id === onlyCharacterId));
    for (const character of characters.slice(0, 16)) {
      ensureIntent(character, now);
    }
    const due = life.intents
      .filter((intent) => ["pending", "sending"].includes(intent.status)
        && (!onlyCharacterId || intent.characterId === onlyCharacterId))
      .sort((a, b) => Number(a.dueAt) - Number(b.dueAt));
    let sent = null;
    let evaluated = 0;
    for (const intent of due) {
      if (intent.status === "sending") {
        if (now - Number(intent.lastEvaluatedAt) > 2 * MINUTE) intent.status = "pending";
        else continue;
      }
      const evaluation = evaluateIntent(intent, now);
      evaluated += 1;
      intent.lastEvaluatedAt = now;
      intent.score = evaluation.score;
      intent.suppressedBy = evaluation.suppressedBy;
      const record = proactiveRecord(intent.characterId, now);
      record.lastEvaluatedAt = now;
      record.lastSuppressedBy = evaluation.suppressedBy;
      if (evaluation.suppressedBy === "expired") {
        intent.status = "expired";
        continue;
      }
      if (!evaluation.allowed) {
        if (evaluation.nextEligibleAt) {
          intent.nextEligibleAt = evaluation.nextEligibleAt;
          intent.dueAt = Math.max(Number(intent.dueAt) || 0, evaluation.nextEligibleAt);
          record.nextEligibleAt = evaluation.nextEligibleAt;
        }
        continue;
      }
      if (!sent) {
        sent = await sendIntent(intent, now);
        if (sent) break;
      }
    }
    await E.saveLifeState();
    return { sent, evaluated };
  }

  async function tick(nowValue, options) {
    if (activeTick) return activeTick;
    activeTick = tickInternal(nowValue, options);
    try {
      return await activeTick;
    } finally {
      activeTick = null;
    }
  }

  async function onUserMessage(chat, nowValue) {
    if (!chat || chat.type !== "direct") return;
    const characterId = Array.isArray(chat.characterIds) ? chat.characterIds[0] : "";
    if (!characterId) return;
    const now = Number(nowValue) || Date.now();
    const life = lifeState();
    const intent = life.intents.find((item) => item.characterId === characterId
      && ["pending", "sending"].includes(item.status));
    if (intent) {
      intent.suppressedBy = "recent-user";
      intent.nextEligibleAt = now + 25 * MINUTE;
      intent.dueAt = Math.max(Number(intent.dueAt) || 0, intent.nextEligibleAt);
      intent.lastEvaluatedAt = now;
    }
    const record = proactiveRecord(characterId, now);
    record.lastSuppressedBy = "recent-user";
    record.lastEvaluatedAt = now;
    record.nextEligibleAt = now + 25 * MINUTE;
    await E.saveLifeState();
  }

  function debugSnapshot(characterId) {
    const now = Date.now();
    const characters = (E.state.characters || []).filter((character) => !characterId || character.id === characterId);
    return characters.map((character) => {
      const state = E.characterStateFor(character, now);
      const pace = paceFor(character);
      const record = proactiveRecord(character.id, now);
      const pending = pendingIntentFor(character.id);
      const evaluation = pending ? evaluateIntent(pending, now) : null;
      return {
        character,
        state,
        mode: modeFor(character),
        modeLabel: E.proactiveModeLabel(modeFor(character)),
        enabled: enabled(character),
        pace,
        record,
        pending,
        evaluation,
        lastSentAt: record.lastSentAt,
        todayCount: record.count,
        dailyCap: pace ? pace.dailyCap : 0,
        lastSuppressedBy: record.lastSuppressedBy,
        lastReason: record.lastReason,
        nextEligibleAt: evaluation && evaluation.nextEligibleAt
          ? evaluation.nextEligibleAt
          : (record.nextEligibleAt || (pending ? pending.dueAt : 0))
      };
    });
  }

  E.proactiveEngine = {
    enabled,
    paceFor,
    modeFor,
    ensureIntent,
    evaluateIntent,
    tick,
    onUserMessage,
    debugSnapshot,
    messageText: localMessage,
    async clearPending(characterId) {
      if (!characterId) return;
      const life = lifeState();
      life.intents = life.intents.filter((intent) => intent.characterId !== characterId
        || !["pending", "sending"].includes(intent.status));
      const record = life.proactive[characterId];
      if (record) {
        record.lastSuppressedBy = "";
        record.nextEligibleAt = 0;
      }
      await E.saveLifeState();
    },
    suppressLabel(suppressedBy) {
      return SUPPRESS_LABELS[suppressedBy] || suppressedBy || "可以发送";
    },
    reasonLabel(reason) {
      return REASON_LABELS[reason] || "想起你";
    },
    async onBoot() {
      const life = lifeState();
      for (const intent of life.intents) {
        if (intent.status === "sending") intent.status = "pending";
      }
      await tick();
    },
    async onVisible() {
      await tick();
    },
    async onHidden() {
      await E.saveLifeState();
    }
  };
})();
