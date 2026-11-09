(function () {
  "use strict";

  const E = window.Ember;
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dayStart(timestamp) {
    const date = new Date(timestamp);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  function dayKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function addDays(timestamp, amount) {
    const date = new Date(timestamp);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()).getTime();
  }

  function pick(list, seed) {
    if (!Array.isArray(list) || !list.length) return "";
    return list[hashString(seed) % list.length];
  }

  function uniqueStrings(value) {
    return Array.from(new Set((Array.isArray(value) ? value : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function sentence(value, maxLength) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength || 96);
  }

  function formatDue(timestamp) {
    if (!timestamp) return "还没有定时间";
    const value = Number(timestamp);
    const diff = value - Date.now();
    if (diff < 0) return `已过期 · ${E.fmtDateTime(value)}`;
    if (diff < DAY) return E.fmtRelative(value);
    return `${E.fmtDay(value)} ${E.fmtClock(value)}`;
  }

  // ---------- normalized state ----------

  E.normalizeRelationshipState = function (raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const timeline = Array.isArray(source.timeline)
      ? source.timeline
        .filter((item) => item && item.text)
        .map((item) => ({
          id: String(item.id || E.uid("rel")),
          type: ["interaction", "tension", "repair", "commitment", "story", "note"].includes(item.type)
            ? item.type
            : "interaction",
          text: sentence(item.text, 140),
          at: Number(item.at || item.createdAt) || Date.now(),
          sourceId: String(item.sourceId || "")
        }))
        .slice(-48)
      : [];
    return {
      closeness: clamp(source.closeness == null ? 38 : source.closeness, 0, 100),
      trust: clamp(source.trust == null ? 42 : source.trust, 0, 100),
      tension: clamp(source.tension == null ? 8 : source.tension, 0, 100),
      unresolvedTopic: String(source.unresolvedTopic || "").trim(),
      unresolvedSince: Math.max(0, Number(source.unresolvedSince) || 0),
      unresolvedSourceId: String(source.unresolvedSourceId || ""),
      lastInteractionAt: Math.max(0, Number(source.lastInteractionAt) || 0),
      lastRepairAt: Math.max(0, Number(source.lastRepairAt) || 0),
      updatedAt: Math.max(0, Number(source.updatedAt) || Date.now()),
      timeline
    };
  };

  E.normalizeCommitment = function (raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const now = Date.now();
    const status = ["pending", "done", "cancelled"].includes(source.status) ? source.status : "pending";
    const visibility = ["private", "group", "public"].includes(source.visibility) ? source.visibility : "private";
    const channel = ["chat", "notification"].includes(source.channel) ? source.channel : "chat";
    return {
      id: String(source.id || E.uid("commitment")),
      characterId: String(source.characterId || ""),
      content: sentence(source.content, 180),
      dueAt: Number(source.dueAt) || now + DAY,
      sourceChatId: String(source.sourceChatId || ""),
      sourceMessageId: String(source.sourceMessageId || ""),
      sourceEventId: String(source.sourceEventId || ""),
      source: ["manual", "local", "model"].includes(source.source) ? source.source : "local",
      status,
      visibility,
      knownBy: uniqueStrings(source.knownBy),
      channel,
      remindedAt: Math.max(0, Number(source.remindedAt) || 0),
      completedAt: Math.max(0, Number(source.completedAt) || 0),
      createdAt: Number(source.createdAt) || now,
      updatedAt: Number(source.updatedAt) || now
    };
  };

  E.normalizeStorylineBeat = function (raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      day: Math.max(0, Number(source.day) || 0),
      title: String(source.title || "今天的一件小事"),
      kind: ["moment", "diary", "message", "call"].includes(source.kind) ? source.kind : "diary",
      text: sentence(source.text, 260),
      echoKind: ["moment", "diary", "message", "call"].includes(source.echoKind) ? source.echoKind : "diary",
      echoText: sentence(source.echoText, 260),
      traceKind: ["memo", "history", "draft", "cart"].includes(source.traceKind) ? source.traceKind : "",
      traceTitle: sentence(source.traceTitle, 80),
      traceText: sentence(source.traceText, 180),
      appliedAt: Math.max(0, Number(source.appliedAt) || 0),
      sourceEventId: String(source.sourceEventId || "")
    };
  };

  E.normalizeStoryline = function (raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const startDay = Number(source.startDay) || dayStart(Date.now());
    const endDay = Math.max(startDay, Number(source.endDay) || startDay + 3 * DAY);
    const status = ["active", "completed"].includes(source.status) ? source.status : "active";
    return {
      id: String(source.id || E.uid("story")),
      characterId: String(source.characterId || ""),
      templateId: String(source.templateId || "daily"),
      title: String(source.title || "这几天"),
      premise: sentence(source.premise, 180),
      startDay,
      endDay,
      durationDays: Math.max(1, Math.round((endDay - startDay) / DAY) + 1),
      status,
      beats: Array.isArray(source.beats) ? source.beats.map(E.normalizeStorylineBeat).slice(0, 12) : [],
      createdAt: Number(source.createdAt) || Date.now(),
      updatedAt: Number(source.updatedAt) || Date.now()
    };
  };

  E.normalizeHerPhoneItem = function (raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const kind = ["memo", "history", "draft", "cart"].includes(source.kind) ? source.kind : "memo";
    return {
      id: String(source.id || E.uid("phone")),
      characterId: String(source.characterId || ""),
      kind,
      title: sentence(source.title, 90),
      text: sentence(source.text, 360),
      sourceEventId: String(source.sourceEventId || ""),
      meta: source.meta && typeof source.meta === "object" ? Object.assign({}, source.meta) : {},
      done: !!source.done,
      createdAt: Number(source.createdAt) || Date.now(),
      updatedAt: Number(source.updatedAt) || Date.now()
    };
  };

  E.normalizeHerPhoneState = function (raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const result = {};
    for (const [characterId, value] of Object.entries(source)) {
      if (!characterId || !value || typeof value !== "object") continue;
      const bucket = {
        memos: [],
        history: [],
        drafts: [],
        cart: [],
        updatedAt: Number(value.updatedAt) || Date.now()
      };
      for (const [key, kind] of [["memos", "memo"], ["history", "history"], ["drafts", "draft"], ["cart", "cart"]]) {
        const rows = Array.isArray(value[key]) ? value[key] : [];
        bucket[key] = rows
          .map((item) => E.normalizeHerPhoneItem(Object.assign({}, item, { characterId, kind })))
          .filter((item) => item.title || item.text)
          .slice(-60);
      }
      result[characterId] = bucket;
    }
    return result;
  };

  E.normalizeBond = function (raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      a: String(source.a || ""),
      b: String(source.b || ""),
      strength: clamp(source.strength == null ? 0.45 : source.strength, 0, 1),
      type: String(source.type || "群友"),
      source: String(source.source || "group"),
      updatedAt: Number(source.updatedAt) || Date.now()
    };
  };

  E.normalizeContinuityState = function (raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      commitments: Array.isArray(source.commitments)
        ? source.commitments.map(E.normalizeCommitment).filter((item) => item.characterId && item.content).slice(-120)
        : [],
      storylines: Array.isArray(source.storylines)
        ? source.storylines.map(E.normalizeStoryline).filter((item) => item.characterId).slice(-30)
        : [],
      herPhone: E.normalizeHerPhoneState(source.herPhone),
      bonds: Array.isArray(source.bonds)
        ? source.bonds.map(E.normalizeBond).filter((item) => item.a && item.b && item.a !== item.b).slice(-80)
        : []
    };
  };

  // ---------- relationship temperature ----------

  const POSITIVE = /谢谢|喜欢你|想你|开心|真好|抱抱|晚安|辛苦|爱你|陪我|好听|好看|温柔|可靠|安心/;
  const CONFLICT = /生气|失望|吵架|讨厌你|别理我|烦死|敷衍|冷淡|不高兴|算了|骗我|不理我|滚/;
  const REPAIR = /对不起|抱歉|是我不好|别生气|原谅|我错了|不该那样|我们聊聊/;

  function relationshipStateFor(character) {
    if (!character) return E.normalizeRelationshipState(null);
    if (!character.relationshipState || typeof character.relationshipState !== "object") {
      const state = E.normalizeRelationshipState(null);
      const relation = String(character.relationship || "");
      if (/暧昧|心动|恋人|爱人|对象/.test(relation)) {
        state.closeness = 54;
        state.trust = 49;
      } else if (/旧友|老朋友|故人/.test(relation)) {
        state.closeness = 47;
        state.trust = 53;
      } else if (/损友|朋友/.test(relation)) {
        state.closeness = 42;
        state.trust = 46;
        state.tension = 10;
      }
      character.relationshipState = state;
    } else {
      character.relationshipState = E.normalizeRelationshipState(character.relationshipState);
    }
    return character.relationshipState;
  }

  function groupTargetCharacterId(chat, message) {
    if (!chat) return "";
    if (message && message.characterId) return String(message.characterId);
    const ids = uniqueStrings(chat.characterIds);
    if (!ids.length) return "";
    if (chat.type !== "group") return ids[0];
    const cutoff = Number(message && message.createdAt) || Date.now();
    const previous = (E.state.messages || [])
      .filter((item) => item && item.chatId === chat.id && item.role === "assistant" && item.characterId)
      .filter((item) => Number(item.createdAt) <= cutoff)
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
      .pop();
    return previous && ids.includes(previous.characterId) ? previous.characterId : ids[0];
  }

  function timelinePush(state, type, text, at, sourceId) {
    if (!text) return;
    state.timeline.push({
      id: E.uid("rel"),
      type,
      text: sentence(text, 140),
      at: Number(at) || Date.now(),
      sourceId: String(sourceId || "")
    });
    state.timeline = state.timeline.slice(-48);
  }

  function relationshipLabel(value) {
    if (value >= 82) return "很近";
    if (value >= 62) return "亲近";
    if (value >= 40) return "熟悉";
    if (value >= 22) return "有点距离";
    return "疏远";
  }

  function temperatureLabel(state) {
    if (state.tension >= 55) return "绷得很紧";
    if (state.tension >= 30) return "有点别扭";
    if (state.closeness >= 70 && state.trust >= 60) return "温度正好";
    if (state.closeness >= 45) return "慢慢熟起来";
    return "还在试探";
  }

  E.relationshipEngine = {
    stateFor(character) {
      return relationshipStateFor(character);
    },

    label(value) {
      return relationshipLabel(value);
    },

    temperatureLabel,

    observe(characterId, text, role, nowValue) {
      const character = E.getCharacter(characterId);
      if (!character) return null;
      const value = String(text || "").trim();
      if (!value) return relationshipStateFor(character);
      const now = Number(nowValue) || Date.now();
      const state = relationshipStateFor(character);
      let changed = false;
      const fromUser = role === "user";
      if (fromUser && REPAIR.test(value)) {
        state.tension = clamp(state.tension - 18, 0, 100);
        state.trust = clamp(state.trust + 3, 0, 100);
        state.closeness = clamp(state.closeness + 1.5, 0, 100);
        state.lastRepairAt = now;
        timelinePush(state, "repair", `你主动把话说开：${sentence(value, 54)}`, now);
        changed = true;
      } else if (fromUser && CONFLICT.test(value)) {
        state.tension = clamp(state.tension + 7, 0, 100);
        state.trust = clamp(state.trust - 2, 0, 100);
        if (!state.unresolvedTopic || state.tension >= 30) {
          state.unresolvedTopic = sentence(value, 90);
          state.unresolvedSince = now;
          state.unresolvedSourceId = "";
        }
        timelinePush(state, "tension", `有一点没说开：${sentence(value, 54)}`, now);
        changed = true;
      } else if (POSITIVE.test(value)) {
        state.closeness = clamp(state.closeness + (fromUser ? 2 : 0.7), 0, 100);
        state.trust = clamp(state.trust + (fromUser ? 0.8 : 0.3), 0, 100);
        state.tension = clamp(state.tension - 1, 0, 100);
        timelinePush(state, "interaction", `${fromUser ? "你" : character.name}说了一句让气氛变软的话：${sentence(value, 48)}`, now);
        changed = true;
      } else if (fromUser && value.length >= 8) {
        state.closeness = clamp(state.closeness + 0.35, 0, 100);
        changed = true;
      }
      state.lastInteractionAt = now;
      state.updatedAt = now;
      if (changed && E.db && E.db.put) {
        void E.db.put("characters", character);
      }
      return state;
    },

    async observeMessage(chat, message) {
      if (!chat || !message || !message.content) return null;
      const ids = message.characterId
        ? [String(message.characterId)]
        : chat.type === "group"
          ? uniqueStrings(chat.characterIds)
          : [String((chat.characterIds || [])[0] || "")].filter(Boolean);
      if (!ids.length) return null;
      let result = null;
      for (const characterId of ids) {
        result = E.relationshipEngine.observe(characterId, message.content, message.role, message.createdAt);
        if (result && E.db && E.db.put) {
          const character = E.getCharacter(characterId);
          if (character) await E.db.put("characters", character);
        }
      }
      return result;
    },

    async resolveUnresolved(characterId, note) {
      const character = E.getCharacter(characterId);
      if (!character) return;
      const state = relationshipStateFor(character);
      const oldTopic = state.unresolvedTopic;
      state.unresolvedTopic = "";
      state.unresolvedSince = 0;
      state.unresolvedSourceId = "";
      state.tension = clamp(state.tension - 12, 0, 100);
      state.trust = clamp(state.trust + 2, 0, 100);
      state.updatedAt = Date.now();
      timelinePush(state, "repair", note || `把「${oldTopic || "那件事"}」聊开了`, Date.now());
      if (E.db && E.db.put) await E.db.put("characters", character);
    },

    needsRepair(character, nowValue) {
      const state = relationshipStateFor(character);
      const now = Number(nowValue) || Date.now();
      return !!(state.unresolvedTopic
        && state.tension >= 24
        && (!state.lastInteractionAt || now - state.lastInteractionAt > 90 * MINUTE));
    },

    adjustGap(baseGap, character) {
      const state = relationshipStateFor(character);
      if (state.tension >= 45) return Math.round(baseGap * 0.72);
      if (state.unresolvedTopic) return Math.round(baseGap * 0.84);
      if (state.closeness >= 68) return Math.round(baseGap * 0.88);
      return Math.round(baseGap);
    },

    promptContext(character) {
      if (!character) return "";
      const state = relationshipStateFor(character);
      const lines = [
        "【关系温度】",
        `亲近 ${Math.round(state.closeness)} / 信任 ${Math.round(state.trust)} / 张力 ${Math.round(state.tension)}，现在${temperatureLabel(state)}。`,
        state.closeness >= 62
          ? "你们已经足够熟，可以自然地提起共同经历，也可以有一点点只属于你们的默契。"
          : "你们还在慢慢熟悉，不要一下子表现得过分亲密。",
        state.tension >= 28
          ? "气氛里有没化开的东西。回复可以短一点，不要假装什么都没发生；如果合适，可以只问一次。"
          : "不需要反复确认关系，正常说话就好。",
        state.unresolvedTopic
          ? `还有一件事没聊开：${state.unresolvedTopic}。不要每次回复都追问，但也不要完全当作忘了。`
          : ""
      ];
      return lines.filter(Boolean).join("\n");
    },

    timeline(characterId) {
      const character = E.getCharacter(characterId);
      if (!character) return [];
      return relationshipStateFor(character).timeline.slice().sort((a, b) => Number(b.at) - Number(a.at));
    }
  };

  // ---------- commitments ----------

  function nextWeekday(now, target) {
    const date = new Date(now);
    const current = date.getDay();
    const normalized = target === 0 ? 7 : target;
    let delta = normalized - current;
    if (delta <= 0) delta += 7;
    date.setDate(date.getDate() + delta);
    return date.getTime();
  }

  function dueAtFromText(text, nowValue) {
    const now = Number(nowValue) || Date.now();
    const value = String(text || "");
    let base = dayStart(now);
    let explicit = false;
    let hour = 20;
    let minute = 0;
    if (/大后天/.test(value)) {
      base = addDays(base, 3);
      explicit = true;
    } else if (/后天/.test(value)) {
      base = addDays(base, 2);
      explicit = true;
    } else if (/明天|明日/.test(value)) {
      base = addDays(base, 1);
      explicit = true;
    } else if (/今晚|今天晚上/.test(value)) {
      explicit = true;
    } else if (/今天|今日/.test(value)) {
      explicit = true;
    } else if (/周末/.test(value)) {
      base = nextWeekday(now, 6);
      explicit = true;
    } else if (/下周/.test(value)) {
      base = nextWeekday(now, 1);
      explicit = true;
    } else {
      const weekday = value.match(/周([一二三四五六日天])/);
      if (weekday) {
        const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
        base = nextWeekday(now, map[weekday[1]]);
        explicit = true;
      }
      const afterDays = value.match(/(\d+)\s*天后/);
      if (afterDays) {
        base = addDays(base, Number(afterDays[1]) || 1);
        explicit = true;
      }
      const monthDay = value.match(/(\d{1,2})月(\d{1,2})[日号]/);
      if (monthDay) {
        const date = new Date(now);
        const target = new Date(date.getFullYear(), Number(monthDay[1]) - 1, Number(monthDay[2]), hour, minute);
        if (target.getTime() <= now) target.setFullYear(target.getFullYear() + 1);
        base = target.getTime();
        explicit = true;
      }
    }
    if (/早上|上午/.test(value)) hour = 9;
    else if (/中午/.test(value)) hour = 12;
    else if (/下午/.test(value)) hour = 15;
    else if (/晚上|今晚|夜里/.test(value)) hour = 20;
    else if (/凌晨/.test(value)) hour = 1;
    const clock = value.match(/(\d{1,2})[:：](\d{2})/);
    if (clock) {
      hour = clamp(Number(clock[1]), 0, 23);
      minute = clamp(Number(clock[2]), 0, 59);
      explicit = true;
    }
    let due = new Date(base);
    due.setHours(hour, minute, 0, 0);
    if (due.getTime() <= now) {
      if (explicit && !/今天|今晚/.test(value)) {
        due = new Date(addDays(due.getTime(), 1));
      } else {
        due = new Date(now + HOUR);
      }
    }
    return due.getTime();
  }

  function commitmentContent(clause) {
    return sentence(
      String(clause || "")
        .replace(/^(那|好|嗯|行|可以|我们|咱们|你|我|到时候|回头|记得|别忘了)[，,\s]*/g, "")
        .replace(/[。！？!?；;]+$/g, "")
        .trim(),
      120
    );
  }

  function extractCommitments(text, nowValue) {
    const now = Number(nowValue) || Date.now();
    const clauses = String(text || "")
      .split(/[。！？!?；;\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 4 && item.length <= 100);
    const rows = [];
    const seen = new Set();
    for (const clause of clauses) {
      const future = /明天|后天|大后天|今晚|今天|周末|下周|周[一二三四五六日天]|\d+\s*天后|\d{1,2}月\d{1,2}[日号]/.test(clause);
      const promise = /答应|约定|说好|别忘了|记得|下次|以后|回头|到时候/.test(clause);
      const action = /见面|吃饭|喝|看|去|来|给|带|发|还|打|买|准备|完成|交|约|一起|提醒|做|修|拿|送|接/.test(clause);
      if ((!future && !promise) || !action) continue;
      if (/昨天|刚才|已经|上个月|上次.*(?:去了|吃了|看了|做了)/.test(clause) && !future) continue;
      const content = commitmentContent(clause);
      if (!content || seen.has(content)) continue;
      seen.add(content);
      rows.push({
        content,
        dueAt: dueAtFromText(clause, now)
      });
      if (rows.length >= 2) break;
    }
    return rows;
  }

  function commitmentList(characterId) {
    const life = E.state.life = E.normalizeLifeState(E.state.life);
    return (life.commitments || [])
      .filter((item) => !characterId || item.characterId === characterId)
      .sort((a, b) => Number(a.status !== "pending") - Number(b.status !== "pending") || Number(a.dueAt) - Number(b.dueAt));
  }

  async function saveCommitments() {
    if (typeof E.saveLifeState === "function") await E.saveLifeState();
  }

  E.commitmentEngine = {
    dueAtFromText,
    extract: extractCommitments,
    listFor(characterId) {
      return commitmentList(characterId);
    },

    pendingFor(characterId) {
      return commitmentList(characterId).filter((item) => item.status === "pending");
    },

    add(characterId, values) {
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      const item = E.normalizeCommitment(Object.assign({
        characterId,
        source: "manual",
        createdAt: Date.now(),
        updatedAt: Date.now()
      }, values || {}));
      if (!item.content) return null;
      life.commitments.push(item);
      life.commitments = life.commitments.slice(-120);
      return item;
    },

    async save() {
      await saveCommitments();
    },

    async complete(id) {
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      const item = life.commitments.find((row) => row.id === id);
      if (!item) return;
      item.status = "done";
      item.completedAt = Date.now();
      item.updatedAt = Date.now();
      const character = E.getCharacter(item.characterId);
      if (character) {
        const state = relationshipStateFor(character);
        state.closeness = clamp(state.closeness + 1.2, 0, 100);
        timelinePush(state, "commitment", `约定完成：${item.content}`, Date.now(), item.id);
        if (E.db && E.db.put) await E.db.put("characters", character);
      }
      await saveCommitments();
    },

    async cancel(id) {
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      const item = life.commitments.find((row) => row.id === id);
      if (!item) return;
      item.status = "cancelled";
      item.updatedAt = Date.now();
      await saveCommitments();
    },

    async remove(id) {
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      life.commitments = life.commitments.filter((item) => item.id !== id);
      await saveCommitments();
    },

    dueIntent(characterId, nowValue) {
      const now = Number(nowValue) || Date.now();
      return commitmentList(characterId)
        .filter((item) => item.status === "pending")
        .filter((item) => Number(item.dueAt) <= now + 12 * HOUR)
        .filter((item) => !item.remindedAt || now - Number(item.remindedAt) > 20 * HOUR)
        .sort((a, b) => Number(a.dueAt) - Number(b.dueAt))[0] || null;
    },

    async markReminded(id) {
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      const item = life.commitments.find((row) => row.id === id);
      if (!item) return;
      item.remindedAt = Date.now();
      item.updatedAt = Date.now();
      await saveCommitments();
    },

    async observeMessage(chat, message) {
      if (!chat || !message || !message.content) return [];
      const characterId = groupTargetCharacterId(chat, message);
      if (!characterId) return [];
      const now = Number(message.createdAt) || Date.now();
      if (message.role === "user") {
        const pending = commitmentList(characterId).filter((item) => item.status === "pending");
        const completion = pending.find((item) => {
          const key = item.content.replace(/[^\u4e00-\u9fa5a-z0-9]/gi, "").slice(0, 8);
          return key && message.content.includes(key) && /做完|完成|搞定|弄好|去了|见了|吃过|交完|买到/.test(message.content);
        });
        if (completion) await E.commitmentEngine.complete(completion.id);
      }
      const rows = extractCommitments(message.content, now);
      if (!rows.length) return [];
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      const knownBy = chat.type === "group"
        ? uniqueStrings(chat.characterIds)
        : [characterId];
      const added = [];
      for (const row of rows) {
        const duplicate = life.commitments.some((item) => item.characterId === characterId
          && item.status === "pending"
          && item.content === row.content
          && Math.abs(Number(item.dueAt) - Number(row.dueAt)) < DAY);
        if (duplicate) continue;
        const item = E.normalizeCommitment({
          characterId,
          content: row.content,
          dueAt: row.dueAt,
          sourceChatId: chat.id,
          sourceMessageId: message.id,
          source: "local",
          visibility: chat.type === "group" ? "group" : "private",
          knownBy,
          channel: "chat",
          createdAt: now,
          updatedAt: now
        });
        life.commitments.push(item);
        added.push(item);
      }
      life.commitments = life.commitments.slice(-120);
      if (added.length) await saveCommitments();
      return added;
    },

    promptContext(character) {
      const rows = commitmentList(character.id)
        .filter((item) => item.status === "pending")
        .slice(0, 5);
      if (!rows.length) return "";
      return [
        "【你们之间还没落地的约定】",
        ...rows.map((item) => `- ${item.content}（${formatDue(item.dueAt)}）`),
        "这些是你自己记着的事。可以在合适的时候自然提一句，不要像日程提醒一样逐条播报。"
      ].join("\n");
    }
  };

  // ---------- multi-day storylines ----------

  const STORY_TEMPLATES = [
    {
      id: "bookstore-stocktake",
      tags: ["书店", "书", "阅读"],
      title: "旧书店盘点周",
      premise: "店里要做一年一次的盘点，旧书、纸箱和一位总在下午出现的客人挤在一起。",
      beats: [
        { title: "第一箱旧书", kind: "diary", text: "今天开始盘点。第一箱里有一本被翻得很旧的诗集，扉页上有人写了一个没有署名的日期。", echoKind: "moment", echoText: "盘点到第一箱旧书。有人把日期写在扉页上，却没有留下名字。", traceKind: "memo", traceTitle: "盘点时要问的事", traceText: "问老板：扉页有字的旧书要不要单独放。" },
        { title: "下午四点的客人", kind: "moment", text: "下午四点，那位常来的客人又站在门口。今天没有进来，只看了看橱窗里的新书。", echoKind: "diary", echoText: "门口的人站了很久。我把新书往里挪了一点，不知道他会不会进来。", traceKind: "history", traceTitle: "搜索：旧书扉页上的字", traceText: "搜了「旧书 扉页 手写日期 有没有收藏价值」。" },
        { title: "少了一本", kind: "message", text: "盘点单上少了一本。我记得它昨天还在最下面那层。", echoKind: "diary", echoText: "少了一本书。可能是记错了，也可能不是。明天再找一遍。", traceKind: "memo", traceTitle: "明天再找一遍", traceText: "最下层 / 仓库右边第二箱 / 问一下晚班。" },
        { title: "纸箱和雨", kind: "diary", text: "下午下雨，门口堆的纸箱受了一点潮。我们把能救的书摊在桌上，像在晒一群不会说话的人。", echoKind: "moment", echoText: "今天店里有一股旧纸和雨的味道。", traceKind: "cart", traceTitle: "除湿盒", traceText: "购物车里放了两个除湿盒。", meta: { price: 29.9, qty: 2 } },
        { title: "盘点结束", kind: "moment", text: "盘点结束了。少的那本书在仓库右边第二箱里，压在一本食谱下面。", echoKind: "diary", echoText: "最后一天。书找到了，纸箱也重新码好。原来有些东西只是被放错了地方。", traceKind: "memo", traceTitle: "盘点结论", traceText: "少的那本找到了。下次盘点前先清仓库右边第二箱。" }
      ]
    },
    {
      id: "friend-moving",
      tags: ["朋友", "热闹", "音乐"],
      title: "朋友搬家",
      premise: "一个朋友要搬走，纸箱、旧唱片和没来得及说出口的告别堆在一起。",
      beats: [
        { title: "纸箱不够了", kind: "message", text: "你那边还有纸箱吗？朋友明天搬家，我现在才发现箱子根本不够。", echoKind: "moment", echoText: "纸箱、胶带、旧唱片。搬家这件事比想象里更像一次小型告别。", traceKind: "cart", traceTitle: "搬家纸箱", traceText: "购物车里放了 5 个加厚纸箱和一卷胶带。", meta: { price: 48, qty: 5 } },
        { title: "旧唱片", kind: "diary", text: "整理到一箱旧唱片。朋友说不要了，我还是偷偷留了一张，封面有一点裂。", echoKind: "moment", echoText: "有些东西被说成不要了，其实只是带不走。", traceKind: "memo", traceTitle: "留下来的唱片", traceText: "那张封面有裂的唱片，先放在我这边。" },
        { title: "最后一顿饭", kind: "moment", text: "在楼下吃了最后一顿饭。谁都没有提搬家，只讨论这家店的辣椒是不是放多了。", echoKind: "diary", echoText: "最后一顿饭没有告别。可能这样更好，像明天还会再见。", traceKind: "history", traceTitle: "搜索：附近还开着的夜宵店", traceText: "搜了「凌晨还开着的店 搬家 朋友」。" },
        { title: "空出来的房间", kind: "diary", text: "房间空出来以后，回声变得很明显。窗户没有关严，风把塑料袋吹得一直响。", echoKind: "moment", echoText: "房间空了，回声比人还大。", traceKind: "draft", traceTitle: "没发出去的草稿", traceText: "到家了吗？房间空得有点不习惯。" },
        { title: "新地址", kind: "message", text: "朋友发来了新地址。我把那张旧唱片收进抽屉，等下次见面再带过去。", echoKind: "diary", echoText: "新地址存好了。下次见面要记得带那张唱片。", traceKind: "memo", traceTitle: "下次见面", traceText: "带那张封面有裂的旧唱片。" }
      ]
    },
    {
      id: "exam-week",
      tags: ["学生", "考试", "学习"],
      title: "考试周",
      premise: "考试周开始了，复习计划、便利店咖啡和一点点自我怀疑挤在同一张桌子上。",
      beats: [
        { title: "复习计划", kind: "diary", text: "列了一张很满的复习计划。写完以后看了很久，觉得自己真正能完成的可能只有一半。", echoKind: "moment", echoText: "计划写得太满的时候，先完成第一行就好。", traceKind: "memo", traceTitle: "今天只做三件事", traceText: "第一章 / 两套题 / 十一点前睡。" },
        { title: "图书馆的灯", kind: "moment", text: "图书馆的灯到十点还亮着。旁边的人一直在翻同一页，可能也没有看进去。", echoKind: "diary", echoText: "今天在图书馆坐到闭馆。回去的路上买了一杯很甜的咖啡。", traceKind: "history", traceTitle: "搜索：熬夜后怎么恢复", traceText: "搜了「熬夜 第二天 头痛 怎么办」。" },
        { title: "模拟题", kind: "message", text: "模拟题做完了，比想象中好一点。只有一点。", echoKind: "diary", echoText: "模拟题没有想象中糟。先不要急着否定自己。", traceKind: "memo", traceTitle: "错题", traceText: "第三章第二节，公式记反了。明天再看一遍。" },
        { title: "考前一天", kind: "diary", text: "考前一天反而看不进去。把书合上，去楼下走了一圈。风有点大，但脑子清楚了一点。", echoKind: "moment", echoText: "考前一天，决定早点睡。", traceKind: "draft", traceTitle: "没发出去的草稿", traceText: "明天考完，想给你打个电话。" },
        { title: "考完", kind: "moment", text: "考完了。没有想象中轻松，但走出考场的时候，天还很亮。", echoKind: "diary", echoText: "考完了。不管结果怎样，今天先不评价自己。", traceKind: "memo", traceTitle: "考后", traceText: "把书收起来。去吃一顿热的。" }
      ]
    },
    {
      id: "theatre-opening",
      tags: ["建筑", "设计", "旧剧院"],
      title: "旧剧院开放日",
      premise: "旧剧院改造进入最后一周，模型、灯光和一处始终不对的台阶占满了工作台。",
      beats: [
        { title: "模型上的灰", kind: "diary", text: "模型上落了一层灰。用吹风机吹了很久，还是有一角看起来像旧照片。", echoKind: "moment", echoText: "旧剧院的模型终于快做完了。", traceKind: "memo", traceTitle: "开放日前", traceText: "确认灯光 / 台阶高度 / 导览牌。" },
        { title: "不对的台阶", kind: "message", text: "台阶还是不对。差了两厘米，所有人都说看不出来，但我看得出来。", echoKind: "diary", echoText: "两厘米。也许只有我会在意，但建筑有时候就是由这些小事组成的。", traceKind: "history", traceTitle: "搜索：旧剧院台阶高度", traceText: "搜了「老剧院 台阶 尺度 无障碍」。" },
        { title: "试灯", kind: "moment", text: "晚上试灯。舞台空着，光落在木地板上，像有人刚刚从这里走过。", echoKind: "diary", echoText: "试灯的时候，忽然明白为什么要保留这栋旧建筑。", traceKind: "memo", traceTitle: "灯光", traceText: "第三组灯再暖一点。舞台边缘不要打满。" },
        { title: "开放日", kind: "diary", text: "开放日来了很多人。有人站在门口说，小时候在这里看过戏。我没有告诉他们，台阶其实还是差两厘米。", echoKind: "moment", echoText: "今天有人在这栋楼里想起了小时候。", traceKind: "draft", traceTitle: "没发出去的草稿", traceText: "开放日结束了。想带你来看看。" },
        { title: "最后一天", kind: "moment", text: "最后一天撤展。把模型装箱的时候，发现那两厘米已经被来来往往的人踩得看不出来了。", echoKind: "diary", echoText: "有些误差会被时间磨平，有些不会。今天先接受前者。", traceKind: "memo", traceTitle: "撤展", traceText: "模型装箱。钥匙还给物业。" }
      ]
    },
    {
      id: "playlist-revision",
      tags: ["音乐", "歌单", "编辑"],
      title: "夜间歌单改版",
      premise: "夜间歌单要改版，投稿、版权和一段始终找不到的歌把夜晚拉得很长。",
      beats: [
        { title: "投稿太多", kind: "message", text: "歌单投稿突然多了起来。每一首都说是「适合夜里听」，但夜里也有很多种。", echoKind: "moment", echoText: "夜里也有很多种。不是每首慢歌都适合凌晨。", traceKind: "memo", traceTitle: "改版方向", traceText: "分成「回家路上」和「睡不着」两段。" },
        { title: "找不到的歌", kind: "diary", text: "有一段旋律一直找不到原曲。哼给朋友听，对方说像某部电影的片尾。可能只是我记错了。", echoKind: "moment", echoText: "有一段旋律，找了很久还是没有名字。", traceKind: "history", traceTitle: "搜索：片尾曲 旋律 找不到", traceText: "搜了「只记得旋律 怎么找歌 电影片尾」。" },
        { title: "凌晨的版本", kind: "diary", text: "凌晨两点做完第三版。第一版其实最好，但我不想承认。", echoKind: "message", echoText: "改到第三版了。现在觉得第一版最好。", traceKind: "draft", traceTitle: "没发出去的草稿", traceText: "你睡了吗？我这边刚好放到一首很适合现在的歌。" },
        { title: "封面", kind: "moment", text: "新封面还是那只歪掉的月亮。同事说该换了，我说再歪一次吧。", echoKind: "diary", echoText: "月亮没有变正。也许这就是这个歌单应该有的样子。", traceKind: "cart", traceTitle: "唱片收纳盒", traceText: "购物车里放了一个透明唱片收纳盒。", meta: { price: 68, qty: 1 } },
        { title: "上线", kind: "moment", text: "改版歌单上线了。第一首不是最热的那首，是我一直想放进去的那首。", echoKind: "diary", echoText: "歌单上线。希望有人会在回家的路上刚好听到。", traceKind: "memo", traceTitle: "歌单上线后", traceText: "看评论。把「回家路上」那段的顺序再听一遍。" }
      ]
    },
    {
      id: "rainy-window",
      tags: ["安静", "生活", "雨"],
      title: "雨季修窗",
      premise: "连着下了几天雨，窗框开始渗水，阳台上的植物和一堆没来得及处理的小事一起发了芽。",
      beats: [
        { title: "窗框渗水", kind: "diary", text: "窗框开始渗水。用毛巾堵了一会儿，还是有一小片墙皮鼓起来。", echoKind: "moment", echoText: "雨季的窗框，比天气预报更早知道要下雨。", traceKind: "cart", traceTitle: "防水胶条", traceText: "购物车里放了防水胶条和一小罐补墙膏。", meta: { price: 39.8, qty: 1 } },
        { title: "楼下的修理工", kind: "message", text: "楼下修理工说这两天排满了，最快后天才能来。", echoKind: "diary", echoText: "修理工后天来。先把窗边的书挪开。", traceKind: "memo", traceTitle: "修窗", traceText: "后天下午，修理工。把窗边书挪开。" },
        { title: "植物长新叶", kind: "moment", text: "窗台上的植物长了一片新叶。之前以为它活不过这个雨季。", echoKind: "diary", echoText: "植物长新叶了。原来有些东西在潮湿里也会往上走。", traceKind: "memo", traceTitle: "植物", traceText: "少浇水。把花盆转个方向。" },
        { title: "修好了", kind: "diary", text: "窗修好了。修理工走后，房间突然安静下来，只剩雨落在空调外机上的声音。", echoKind: "message", echoText: "窗修好了。现在终于听不见那滴水声了。", traceKind: "draft", traceTitle: "没发出去的草稿", traceText: "窗修好了。你要不要来听一下，现在真的很安静。" },
        { title: "雨停", kind: "moment", text: "雨停了。窗边还有一点潮气，但已经不再滴水。", echoKind: "diary", echoText: "雨停了。把窗打开，房间里的味道慢慢换了。", traceKind: "memo", traceTitle: "雨停之后", traceText: "开窗通风。把毛巾洗了。" }
      ]
    }
  ];

  function chooseStoryTemplate(character, seed) {
    const text = `${character.name || ""} ${character.persona || ""} ${(character.tags || []).join(" ")} ${character.relationship || ""}`;
    const matches = STORY_TEMPLATES.filter((template) => template.tags.some((tag) => text.includes(tag)));
    if (matches.length) return matches[hashString(seed) % matches.length];
    return STORY_TEMPLATES[hashString(seed) % STORY_TEMPLATES.length];
  }

  function ensureStoryline(character, nowValue) {
    const life = E.state.life = E.normalizeLifeState(E.state.life);
    const now = Number(nowValue) || Date.now();
    const today = dayStart(now);
    let active = life.storylines.find((story) => story.characterId === character.id
      && story.status === "active"
      && Number(story.endDay) >= today);
    if (active) return active;
    for (const story of life.storylines) {
      if (story.characterId === character.id && story.status === "active" && Number(story.endDay) < today) {
        story.status = "completed";
        story.updatedAt = now;
      }
    }
    const seed = `${character.id}:${today}:${life.storylines.length}`;
    const template = chooseStoryTemplate(character, seed);
    const durationDays = 3 + (hashString(seed) % 5);
    const startDay = today;
    const endDay = addDays(startDay, durationDays - 1);
    const beats = template.beats.map((beat, index) => E.normalizeStorylineBeat(Object.assign({}, beat, {
      day: Math.min(durationDays - 1, Math.floor((index * durationDays) / template.beats.length)),
      echoKind: beat.echoKind || (beat.kind === "moment" ? "diary" : "moment")
    })));
    const story = E.normalizeStoryline({
      id: E.uid("story"),
      characterId: character.id,
      templateId: template.id,
      title: template.title,
      premise: template.premise,
      startDay,
      endDay,
      durationDays,
      status: "active",
      beats,
      createdAt: now,
      updatedAt: now
    });
    life.storylines.push(story);
    life.storylines = life.storylines.slice(-30);
    return story;
  }

  function storylineEvent(story, beat, character, now, dnd) {
    const sourceEventId = `story:${story.id}:${beat.day}`;
    const allCharacterIds = uniqueStrings((E.state.characters || []).map((item) => item.id));
    const visibleTo = beat.kind === "moment" ? allCharacterIds : [character.id];
    const quiet = dnd && dnd.enabled
      && typeof E.lifeEngine !== "undefined"
      && E.lifeEngine.inDndWindow(now, dnd);
    const primary = {
      id: `life_story_${hashString(`${story.id}:${beat.day}:primary`).toString(36)}`,
      key: `story:${story.id}:${beat.day}:primary`,
      type: beat.kind,
      characterId: character.id,
      characterName: character.name || "某个人",
      title: beat.title,
      text: beat.text,
      mood: beat.kind === "diary" ? "有点心事" : "",
      route: "",
      reason: `正在经历「${story.title}」 · ${beat.title}`,
      silent: !!quiet,
      createdAt: now - 18 * MINUTE,
      sourceEventId,
      storylineId: story.id,
      visibleTo,
      knownBy: visibleTo.slice(),
      trace: {
        kind: beat.traceKind,
        title: beat.traceTitle,
        text: beat.traceText
      }
    };
    if (primary.type === "message") {
      const chat = (E.state.chats || []).find((item) => item.type === "direct"
        && Array.isArray(item.characterIds)
        && item.characterIds[0] === character.id);
      primary.route = chat ? `#/chat/${chat.id}` : "#/chat";
    } else if (primary.type === "moment") {
      primary.route = "#/moments";
    } else if (primary.type === "call") {
      primary.route = "#/calls";
    } else {
      primary.route = "#/diary";
    }
    const echoType = beat.echoKind && beat.echoKind !== primary.type ? beat.echoKind : (primary.type === "moment" ? "diary" : "moment");
    const echo = {
      id: `life_story_${hashString(`${story.id}:${beat.day}:echo`).toString(36)}`,
      key: `story:${story.id}:${beat.day}:echo`,
      type: echoType,
      characterId: character.id,
      characterName: character.name || "某个人",
      title: beat.title,
      text: beat.echoText || beat.text,
      mood: echoType === "diary" ? "平静" : "",
      route: echoType === "moment" ? "#/moments" : echoType === "diary" ? "#/diary" : "#/chat",
      reason: `同一件事的另一面 · ${beat.title}`,
      silent: true,
      createdAt: now - 8 * MINUTE,
      sourceEventId,
      storylineId: story.id,
      visibleTo: echoType === "moment" ? allCharacterIds.slice() : [character.id],
      knownBy: echoType === "moment" ? allCharacterIds.slice() : [character.id]
    };
    return [primary, echo];
  }

  E.storylineEngine = {
    templates: STORY_TEMPLATES,

    ensureFor(character, now) {
      return ensureStoryline(character, now);
    },

    activeFor(characterId) {
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      const today = dayStart(Date.now());
      return life.storylines.find((story) => story.characterId === characterId
        && story.status === "active"
        && Number(story.endDay) >= today) || null;
    },

    materialize(options) {
      const opts = options || {};
      const now = Number(opts.now) || Date.now();
      const elapsedMs = Math.max(0, Number(opts.elapsedMs) || 0);
      if (elapsedMs < 90 * MINUTE) return [];
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      const maxPerDay = Math.max(1, Number(opts.maxPerDay) || 5);
      const remaining = Math.max(0, maxPerDay - (Number(opts.todayCount) || 0));
      if (remaining <= 0) return [];
      const characters = (opts.characters || [])
        .filter((character) => character && character.id)
        .sort((a, b) => hashString(`${now}:${a.id}`) - hashString(`${now}:${b.id}`));
      const today = dayStart(now);
      const events = [];
      for (const character of characters) {
        if (events.length >= Math.min(2, remaining)) break;
        const story = ensureStoryline(character, now);
        if (!story || story.status !== "active") continue;
        const dayIndex = Math.floor((today - Number(story.startDay)) / DAY);
        if (dayIndex < 0 || dayIndex >= story.durationDays) continue;
        const beat = story.beats.find((item) => Number(item.day) === dayIndex);
        if (!beat || beat.appliedAt) continue;
        const rows = storylineEvent(story, beat, character, now, opts.dnd);
        const fresh = rows.filter((event) => {
          const key = event.key;
          if ((opts.existingKeys || []).includes(key)) return false;
          return !events.some((item) => item.key === key);
        });
        if (!fresh.length) continue;
        beat.appliedAt = now;
        beat.sourceEventId = `story:${story.id}:${beat.day}`;
        story.updatedAt = now;
        events.push(...fresh);
      }
      return events;
    },

    contextFor(character) {
      const story = E.storylineEngine.activeFor(character.id);
      if (!story) return "";
      const applied = story.beats.filter((beat) => beat.appliedAt).slice(-2);
      return [
        "【你这几天正在经历的事】",
        `${story.title}：${story.premise}`,
        ...applied.map((beat) => `- ${beat.title}：${beat.text}`),
        "这些是你自己的生活背景，不要把它写成任务清单，也不要把每一天都汇报出来。"
      ].join("\n");
    },

    timelineFor(characterId) {
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      const story = life.storylines.find((item) => item.characterId === characterId
        && item.status === "active"
        && Number(item.endDay) >= dayStart(Date.now()));
      return story ? story.beats.slice() : [];
    },

    referenceFor(sourceEventId) {
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      const story = life.storylines.find((item) => (item.beats || []).some((beat) => beat.sourceEventId === sourceEventId));
      if (!story) return null;
      const beat = story.beats.find((item) => item.sourceEventId === sourceEventId);
      return beat ? { story, beat } : null;
    }
  };

  // ---------- her phone traces ----------

  const PHONE_KIND_LABELS = {
    memo: "备忘录",
    history: "浏览记录",
    draft: "草稿箱",
    cart: "购物车"
  };

  function phoneBucket(characterId) {
    const life = E.state.life = E.normalizeLifeState(E.state.life);
    if (!life.herPhone[characterId]) {
      life.herPhone[characterId] = {
        memos: [],
        history: [],
        drafts: [],
        cart: [],
        updatedAt: Date.now()
      };
    }
    return life.herPhone[characterId];
  }

  function addPhoneItem(characterId, kind, values) {
    const bucket = phoneBucket(characterId);
    const key = {
      memo: "memos",
      history: "history",
      draft: "drafts",
      cart: "cart"
    }[kind] || "memos";
    const item = E.normalizeHerPhoneItem(Object.assign({
      characterId,
      kind,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, values || {}));
    if (!item.title && !item.text) return null;
    if (item.sourceEventId && bucket[key].some((row) => row.sourceEventId === item.sourceEventId && row.kind === kind)) {
      return null;
    }
    bucket[key].push(item);
    bucket[key] = bucket[key].slice(-60);
    bucket.updatedAt = Date.now();
    return item;
  }

  function seedPhone(character) {
    const bucket = phoneBucket(character.id);
    if (bucket.memos.length || bucket.history.length || bucket.drafts.length || bucket.cart.length) return bucket;
    const name = character.name || "她";
    addPhoneItem(character.id, "memo", {
      title: "最近记着的事",
      text: `${name}的备忘录：周五之前把借来的书还掉。冰箱里还有半盒牛奶。`,
      createdAt: Date.now() - 2 * HOUR
    });
    addPhoneItem(character.id, "memo", {
      title: "想买",
      text: "窗边那盏灯，暖色，不要太亮。",
      createdAt: Date.now() - 5 * HOUR
    });
    addPhoneItem(character.id, "history", {
      title: "搜索：夜里适合走路的歌",
      text: "「夜里适合走路的歌」 · 看了 3 个结果，没有点开最后一篇。",
      createdAt: Date.now() - 7 * HOUR
    });
    addPhoneItem(character.id, "history", {
      title: "搜索：怎么把旧书写平",
      text: "「旧书 压平 纸页 受潮」 · 收藏了一个很长的教程。",
      createdAt: Date.now() - 26 * HOUR
    });
    addPhoneItem(character.id, "draft", {
      title: "没发出去的话",
      text: "今天有一瞬间想问你，后来觉得算了。",
      createdAt: Date.now() - 9 * HOUR
    });
    addPhoneItem(character.id, "cart", {
      title: "暖色小台灯",
      text: "放在窗边刚好。",
      meta: { price: 129, qty: 1 },
      createdAt: Date.now() - 3 * HOUR
    });
    return phoneBucket(character.id);
  }

  function traceForEvent(event) {
    if (event.trace && event.trace.kind) {
      return {
        kind: event.trace.kind,
        title: event.trace.title || event.title || "一条手机痕迹",
        text: event.trace.text || event.text
      };
    }
    if (event.type === "moment") {
      return {
        kind: "history",
        title: "看过一条和今天有关的页面",
        text: `浏览记录：${sentence(event.text, 80)}`
      };
    }
    if (event.type === "diary") {
      return {
        kind: "memo",
        title: "睡前记一下",
        text: sentence(event.text, 120)
      };
    }
    if (event.type === "message") {
      return {
        kind: "draft",
        title: "没发出去的话",
        text: `草稿：${sentence(event.text, 100)}`
      };
    }
    return {
      kind: "history",
      title: "刚刚看过的联系人",
      text: `在通讯录里停了一会儿。${sentence(event.text, 80)}`
    };
  }

  E.herPhoneEngine = {
    labels: PHONE_KIND_LABELS,

    stateFor(characterId) {
      const character = E.getCharacter(characterId);
      if (!character) return null;
      return seedPhone(character);
    },

    itemsFor(characterId, kind) {
      const bucket = E.herPhoneEngine.stateFor(characterId);
      if (!bucket) return [];
      const key = { memo: "memos", history: "history", draft: "drafts", cart: "cart" }[kind];
      if (!key) {
        return ["memos", "history", "drafts", "cart"].flatMap((name) => bucket[name] || [])
          .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      }
      return (bucket[key] || []).slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    },

    add(characterId, kind, values) {
      const item = addPhoneItem(characterId, kind, values);
      if (item) void E.saveLifeState();
      return item;
    },

    async remove(characterId, kind, id) {
      const bucket = phoneBucket(characterId);
      const key = { memo: "memos", history: "history", draft: "drafts", cart: "cart" }[kind] || "memos";
      bucket[key] = (bucket[key] || []).filter((item) => item.id !== id);
      bucket.updatedAt = Date.now();
      await E.saveLifeState();
    },

    async toggleDone(characterId, kind, id) {
      const bucket = phoneBucket(characterId);
      const key = { memo: "memos", history: "history", draft: "drafts", cart: "cart" }[kind] || "memos";
      const item = (bucket[key] || []).find((row) => row.id === id);
      if (!item) return;
      item.done = !item.done;
      item.updatedAt = Date.now();
      await E.saveLifeState();
    },

    ingestEvent(event, character) {
      if (!event || !character) return;
      const trace = traceForEvent(event);
      addPhoneItem(character.id, trace.kind, {
        title: trace.title,
        text: trace.text,
        sourceEventId: event.sourceEventId || event.id,
        createdAt: Number(event.createdAt) || Date.now()
      });
      if (event.type === "moment" && hashString(event.key || event.id) % 4 === 0) {
        addPhoneItem(character.id, "cart", {
          title: "一件和今天有关的小东西",
          text: "看了很久，先放进购物车。",
          meta: { price: 39 + (hashString(event.id) % 80), qty: 1 },
          sourceEventId: event.sourceEventId || event.id,
          createdAt: Number(event.createdAt) + 60000
        });
      }
    },

    summary(characterId) {
      const bucket = E.herPhoneEngine.stateFor(characterId);
      if (!bucket) return { total: 0, memos: 0, history: 0, drafts: 0, cart: 0 };
      return {
        total: bucket.memos.length + bucket.history.length + bucket.drafts.length + bucket.cart.length,
        memos: bucket.memos.length,
        history: bucket.history.length,
        drafts: bucket.drafts.length,
        cart: bucket.cart.length
      };
    }
  };

  // ---------- character-to-character interaction ----------

  function ensureBonds() {
    const life = E.state.life = E.normalizeLifeState(E.state.life);
    const groups = (E.state.chats || []).filter((chat) => chat.type === "group" && Array.isArray(chat.characterIds));
    for (const chat of groups) {
      const ids = uniqueStrings(chat.characterIds);
      for (let a = 0; a < ids.length; a += 1) {
        for (let b = a + 1; b < ids.length; b += 1) {
          const one = ids[a];
          const two = ids[b];
          if (!life.bonds.some((bond) => (bond.a === one && bond.b === two) || (bond.a === two && bond.b === one))) {
            life.bonds.push(E.normalizeBond({
              a: one,
              b: two,
              strength: 0.45,
              type: "群友",
              source: chat.id
            }));
          }
        }
      }
    }
    life.bonds = life.bonds.slice(-80);
    return life.bonds;
  }

  function bondBetween(a, b) {
    const life = E.state.life = E.normalizeLifeState(E.state.life);
    return life.bonds.find((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a)) || null;
  }

  function canSee(event, viewerId) {
    if (!event || !viewerId) return false;
    if (Array.isArray(event.visibleTo) && event.visibleTo.length && !event.visibleTo.includes(viewerId)) return false;
    if (Array.isArray(event.knownBy) && event.knownBy.length && !event.knownBy.includes(viewerId)) return false;
    return true;
  }

  E.characterInteractionEngine = {
    ensureBonds,

    bondBetween,

    canSee,

    commentsFor(event, speaker, allCharacters) {
      if (!event || event.type !== "moment" || !speaker) return [];
      ensureBonds();
      const candidates = (allCharacters || E.state.characters || [])
        .filter((character) => character && character.id !== speaker.id && canSee(event, character.id))
        .filter((character) => {
          const bond = bondBetween(speaker.id, character.id);
          return bond ? bond.strength >= 0.2 : hashString(`${event.key}:${character.id}`) % 3 === 0;
        })
        .sort((a, b) => hashString(`${event.key}:${a.id}`) - hashString(`${event.key}:${b.id}`));
      if (!candidates.length) return [];
      const count = 1 + (hashString(`${event.key}:count`) % 2);
      const comments = [];
      for (let index = 0; index < Math.min(count, candidates.length); index += 1) {
        const character = candidates[index];
        const previous = comments[comments.length - 1];
        const replyTo = previous && hashString(`${event.key}:reply:${index}`) % 3 === 0 ? previous.name : "";
        const base = pick([
          "这张有点像你上次说的那家店。",
          "你又把话说一半。",
          "我路过的时候也看到了。",
          "下次叫我。",
          "光线不错。",
          "今天这句我记住了。"
        ], `${event.key}:${character.id}:${index}`);
        comments.push({
          id: E.uid("cmt"),
          characterId: character.id,
          name: character.name,
          text: base,
          replyTo,
          createdAt: Number(event.createdAt) + 60000 * (index + 1)
        });
      }
      return comments;
    },

    groupInterjection(chat, speakerId, text, nowValue) {
      if (!chat || chat.type !== "group") return null;
      const ids = uniqueStrings(chat.characterIds).filter((id) => id !== speakerId);
      if (!ids.length) return null;
      const now = Number(nowValue) || Date.now();
      const speaker = E.getCharacter(speakerId);
      if (!speaker) return null;
      ensureBonds();
      const candidates = ids
        .map((id) => E.getCharacter(id))
        .filter(Boolean)
        .sort((a, b) => {
          const one = bondBetween(speakerId, a.id);
          const two = bondBetween(speakerId, b.id);
          return (two ? two.strength : 0) - (one ? one.strength : 0);
        });
      const character = candidates[0];
      if (!character) return null;
      if (hashString(`${chat.id}:${speakerId}:${now}`) % 100 >= 32) return null;
      const lines = [
        `那我也说一句。${sentence(text, 34)}这件事，我站${speaker.name}。`,
        `${speaker.name}都这么说了。那我补一句：别把话憋太久。`,
        `我刚刚也想说这个。${speaker.name}先说了。`,
        `行，${speaker.name}负责说，我负责记住。`
      ];
      return {
        characterId: character.id,
        name: character.name,
        text: pick(lines, `${chat.id}:${speakerId}:${now}`),
        createdAt: now
      };
    },

    visibleCharactersFor(moment) {
      return (E.state.characters || []).filter((character) => canSee(moment, character.id));
    }
  };

  E.continuity = {
    dayKey,
    dayStart,
    formatDue,
    commitmentStatusLabel(status) {
      return { pending: "还没到", done: "已完成", cancelled: "已取消" }[status] || "未完成";
    },
    commitmentSourceLabel(source) {
      return { manual: "手动添加", local: "从聊天里记下", model: "模型整理" }[source] || "记下的约定";
    },
    referenceForMessage(message) {
      if (!message) return null;
      const memoryIds = Array.isArray(message.memoryIds) ? message.memoryIds : [];
      const memories = memoryIds.map((id) => E.state.memories.find((memory) => memory.id === id)).filter(Boolean);
      const story = message.sourceEventId && E.storylineEngine
        ? E.storylineEngine.referenceFor(message.sourceEventId)
        : null;
      const event = message.sourceEventId
        ? (E.state.life && Array.isArray(E.state.life.batch)
          ? E.state.life.batch.find((item) => item.sourceEventId === message.sourceEventId)
          : null)
        : null;
      return { memories, story, event };
    },
    removeCharacterData(characterId) {
      const id = String(characterId || "");
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      if (!id) return life;
      life.commitments = life.commitments.filter((item) => item.characterId !== id);
      life.storylines = life.storylines.filter((item) => item.characterId !== id);
      delete life.herPhone[id];
      life.bonds = life.bonds.filter((item) => item.a !== id && item.b !== id);
      life.intents = life.intents.filter((item) => item.characterId !== id);
      life.batch = life.batch.filter((item) => item.characterId !== id);
      if (life.proactive) delete life.proactive[id];
      return life;
    }
  };
})();
