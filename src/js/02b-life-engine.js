(function () {
  "use strict";

  const E = window.Ember;
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  const MOMENT_LINES = [
    "今天把「{tag}」这件事又做了一遍。没有特别的原因，只是习惯了。",
    "路过一家店，想起你说过的话。没停下来，但走慢了一点。",
    "窗外开始暗了。手机亮了一下，不是你的消息。",
    "今天的光很淡，适合把没做完的事再拖一天。",
    "在楼下站了一会儿。风比想象中冷，但还是不想马上上去。",
    "有些话在脑子里说完了，真正要开口的时候又觉得不必了。",
    "今天没有发生什么。只是突然想把这一刻记下来。",
    "和{relation}的人相处久了，会开始注意一些很小的事。比如杯子放在哪一边。"
  ];

  const DIARY_LINES = [
    {
      title: "今天没有发生什么",
      mood: "平静",
      content: "今天没有发生什么大事。\n只是把窗户开了一会儿，听见楼下有人笑。\n后来就忘了自己本来要做什么。"
    },
    {
      title: "把今天收起来",
      mood: "疲惫",
      content: "回来的时候绕了远路。\n路灯一盏一盏亮起来，像有人在前面替我开门。\n走到楼下才发现，手里的咖啡已经凉了。"
    },
    {
      title: "晚一点也没关系",
      mood: "期待",
      content: "把没回的消息看了一遍，还是没有回。\n不是不想，只是不知道从哪里开始。\n明天再说吧。"
    },
    {
      title: "一点点好",
      mood: "开心",
      content: "今天比昨天好一点。\n好一点也值得记下来。\n至少窗台上的那盆植物还活着。"
    },
    {
      title: "夜里的声音",
      mood: "低落",
      content: "很晚了，楼下还有人在说话。\n听不清内容，只觉得那种热闹离自己很远。\n关灯以后，房间安静得有点陌生。"
    }
  ];

  const CALL_LINES = [
    "刚刚想问你一件事，拨出去才想起你可能没空。",
    "手机在手里停了很久，最后还是没有按下去。",
    "今天有一瞬间很想听见你的声音。",
    "本来只是想听听你那边在做什么。"
  ];

  const MESSAGE_LINES = [
    "在忙吗？",
    "刚刚看到一件很适合你的事，等你有空再说。",
    "今天路过你说的那家店了。",
    "没什么事，就是想问一句，你今天还好吗。",
    "晚点回我也行。",
    "突然想起来，你上次说的那件事后来怎么样了？"
  ];

  const TYPE_LABELS = {
    moment: "动态",
    diary: "日记",
    call: "未接来电",
    message: "消息"
  };

  const TYPE_ICONS = {
    moment: "moments",
    diary: "diary",
    call: "phone",
    message: "chat"
  };

  E.LIFE_PACES = {
    quiet: {
      label: "安静",
      description: "大约每 6 小时，最多 2 件/天",
      gapMs: 6 * HOUR,
      maxPerDay: 2,
      maxPerReturn: 1
    },
    normal: {
      label: "正常",
      description: "大约每 2 小时，最多 5 件/天",
      gapMs: 2 * HOUR,
      maxPerDay: 5,
      maxPerReturn: 2
    },
    lively: {
      label: "热闹",
      description: "大约每 45 分钟，最多 8 件/天",
      gapMs: 45 * 60 * 1000,
      maxPerDay: 8,
      maxPerReturn: 3
    }
  };

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

  function dayKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function hourKey(timestamp) {
    return `${dayKey(timestamp)}-${pad(new Date(timestamp).getHours())}`;
  }

  function pick(list, seed) {
    return list[hashString(seed) % list.length];
  }

  function clockMinutes(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function characterTag(character) {
    const tags = Array.isArray(character.tags) ? character.tags.filter(Boolean) : [];
    if (tags.length) return tags[0];
    const persona = String(character.persona || "").split(/[。\n]/)[0].trim();
    return persona ? persona.slice(0, 12) : "日常";
  }

  function renderLine(template, character) {
    return String(template)
      .replaceAll("{name}", character.name || "她")
      .replaceAll("{tag}", characterTag(character))
      .replaceAll("{relation}", character.relationship || "熟悉");
  }

  E.normalizeLifeState = function (raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const batch = Array.isArray(source.batch)
      ? source.batch.slice(0, 12).map((event) => {
        if (!event || !event.type || !event.characterId) return null;
        return {
          id: String(event.id || E.uid("life")),
          key: String(event.key || ""),
          type: String(event.type),
          characterId: String(event.characterId),
          characterName: String(event.characterName || ""),
          title: String(event.title || ""),
          text: String(event.text || ""),
          mood: String(event.mood || ""),
          route: String(event.route || ""),
          reason: String(event.reason || ""),
          silent: !!event.silent,
          createdAt: Number(event.createdAt) || Date.now()
        };
      }).filter(Boolean)
      : [];
    return {
      awayMs: Math.max(0, Number(source.awayMs) || 0),
      awaySince: Math.max(0, Number(source.awaySince) || 0),
      lastAwayMs: Math.max(0, Number(source.lastAwayMs) || 0),
      dayKey: String(source.dayKey || ""),
      todayCount: Math.max(0, Number(source.todayCount) || 0),
      lastSettledAt: Math.max(0, Number(source.lastSettledAt) || 0),
      batch,
      recentKeys: Array.isArray(source.recentKeys) ? source.recentKeys.map(String).slice(-80) : []
    };
  };

  E.saveLifeState = async function () {
    E.state.life = E.normalizeLifeState(E.state.life);
    await E.db.setMeta("lifeState", E.state.life);
  };

  E.lifeEngine = {
    paceConfig(pace) {
      return E.LIFE_PACES[pace] || E.LIFE_PACES.normal;
    },

    inDndWindow(timestamp, dnd) {
      if (!dnd || !dnd.enabled) return false;
      const start = clockMinutes(dnd.start);
      const end = clockMinutes(dnd.end);
      if (start === null || end === null || start === end) return false;
      const date = new Date(timestamp);
      const minutes = date.getHours() * 60 + date.getMinutes();
      if (start < end) return minutes >= start && minutes < end;
      return minutes >= start || minutes < end;
    },

    formatAway(ms) {
      const value = Math.max(0, Number(ms) || 0);
      if (value < HOUR) return `${Math.max(1, Math.round(value / 60000))} 分钟`;
      if (value < DAY) return `${Math.max(1, Math.round(value / HOUR))} 小时`;
      return `${Math.max(1, Math.round(value / DAY))} 天`;
    },

    chooseType(character, timestamp, seed, quiet) {
      const hour = new Date(timestamp).getHours();
      const roll = hashString(`${seed}:${character.id}:${hour}`) % 100;
      if (quiet) {
        return roll < 60 ? "diary" : "moment";
      }
      if (hour >= 23 || hour < 6) {
        return roll < 62 ? "diary" : "moment";
      }
      if (hour >= 22) {
        if (roll < 52) return "diary";
        if (roll < 84) return "message";
        return "call";
      }
      if (hour < 11) {
        if (roll < 42) return "moment";
        if (roll < 72) return "diary";
        return "message";
      }
      if (hour < 18) {
        if (roll < 52) return "moment";
        if (roll < 76) return "message";
        return "diary";
      }
      if (roll < 46) return "moment";
      if (roll < 68) return "call";
      if (roll < 86) return "message";
      return "diary";
    },

    buildEvent(type, character, timestamp, seed, chats) {
      const base = {
        id: `life_${hashString(seed).toString(36)}`,
        key: `${type}:${character.id}:${hourKey(timestamp)}`,
        type,
        characterId: character.id,
        characterName: character.name || "某个人",
        title: "",
        text: "",
        mood: "",
        route: "",
        reason: "",
        silent: false,
        createdAt: timestamp
      };
      if (type === "moment") {
        base.text = renderLine(pick(MOMENT_LINES, seed), character);
        base.route = "#/moments";
        base.reason = new Date(timestamp).getHours() >= 23 || new Date(timestamp).getHours() < 6
          ? "夜里没有睡，忽然想发点什么"
          : "路过一个熟悉的场景";
      } else if (type === "diary") {
        const diary = pick(DIARY_LINES, seed);
        base.title = diary.title;
        base.text = diary.content;
        base.mood = diary.mood;
        base.route = "#/diary";
        base.reason = new Date(timestamp).getHours() >= 23 || new Date(timestamp).getHours() < 6
          ? "夜深了，想把没说完的话收起来"
          : "今天有一件小事值得记下来";
      } else if (type === "call") {
        base.text = pick(CALL_LINES, seed);
        base.route = "#/calls";
        base.reason = "有话想说，拨出去又挂了";
      } else {
        base.text = pick(MESSAGE_LINES, seed);
        const chat = (chats || []).find((item) => item.type === "direct" && item.characterIds && item.characterIds[0] === character.id);
        base.route = chat ? `#/chat/${chat.id}` : "#/chat";
        base.reason = "突然想起你";
      }
      return base;
    },

    planBatch(options) {
      const opts = options || {};
      const now = Number(opts.now) || Date.now();
      const elapsedMs = Math.max(0, Number(opts.elapsedMs) || 0);
      const config = E.lifeEngine.paceConfig(opts.pace);
      const characters = (opts.characters || []).filter((item) => item && item.id);
      const empty = {
        events: [],
        elapsedMs,
        pace: config.label,
        gapMs: config.gapMs,
        capped: false,
        reason: ""
      };
      if (elapsedMs < config.gapMs) return Object.assign(empty, { reason: "too-soon" });
      if (!characters.length) return Object.assign(empty, { reason: "no-characters" });

      const todayCount = Math.max(0, Number(opts.todayCount) || 0);
      const dailyRemaining = Math.max(0, config.maxPerDay - todayCount);
      const timeSlots = Math.max(1, Math.floor(elapsedMs / config.gapMs));
      const wanted = Math.min(config.maxPerReturn, dailyRemaining, timeSlots);
      if (wanted <= 0) {
        return Object.assign(empty, {
          capped: true,
          reason: dailyRemaining <= 0 ? "daily-cap" : "no-slots"
        });
      }

      const existing = new Set((opts.existingKeys || []).map(String));
      const events = [];
      const span = Math.min(elapsedMs, 6 * HOUR);
      for (let slot = 0; slot < wanted; slot += 1) {
        const seed = `${now}:${elapsedMs}:${slot}:${opts.seed || ""}`;
        const character = characters[hashString(seed) % characters.length];
        const eventTime = now - span + Math.round((span * (slot + 1)) / (wanted + 1));
        const quiet = E.lifeEngine.inDndWindow(eventTime, opts.dnd);
        const type = E.lifeEngine.chooseType(character, eventTime, seed, quiet);
        const event = E.lifeEngine.buildEvent(type, character, eventTime, seed, opts.chats || []);
        if (existing.has(event.key)) continue;
        event.silent = quiet;
        event.reason = quiet
          ? `${E.lifeEngine.formatAway(elapsedMs)}没说话 · 勿扰时段，只留下一点痕迹`
          : `${E.lifeEngine.formatAway(elapsedMs)}没说话 · ${event.reason}`;
        existing.add(event.key);
        events.push(event);
      }

      return Object.assign(empty, {
        events,
        capped: wanted < Math.min(config.maxPerReturn, timeSlots),
        reason: events.length ? "ok" : "duplicate"
      });
    },

    summaryText(events, elapsedMs) {
      const rows = Array.isArray(events) ? events : [];
      if (!rows.length) return "";
      const counts = rows.reduce((result, event) => {
        result[event.type] = (result[event.type] || 0) + 1;
        return result;
      }, {});
      const parts = [];
      if (counts.moment) parts.push(`${counts.moment} 条动态`);
      if (counts.diary) parts.push(`${counts.diary} 篇日记`);
      if (counts.call) parts.push(`${counts.call} 通未接来电`);
      if (counts.message) parts.push(`${counts.message} 条消息`);
      return `你不在的 ${E.lifeEngine.formatAway(elapsedMs)}里，${parts.join("、")}。`;
    },

    homeSummary() {
      const life = E.state.life || {};
      const events = Array.isArray(life.batch) ? life.batch : [];
      if (!events.length) return null;
      const sorted = events.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      return {
        text: E.lifeEngine.summaryText(sorted, life.lastAwayMs || 0),
        sub: sorted[0].text.split("\n")[0].slice(0, 48),
        count: sorted.length
      };
    },

    async applyEvents(events) {
      const rows = Array.isArray(events) ? events : [];
      if (!rows.length) return;
      for (const event of rows) {
        const character = E.getCharacter(event.characterId);
        if (!character) continue;
        if (event.type === "moment") {
          const others = E.state.characters.filter((item) => item.id !== character.id);
          const comments = [];
          if (others.length && hashString(event.key) % 3 === 0) {
            const other = others[hashString(`${event.key}:comment`) % others.length];
            comments.push({
              id: E.uid("cmt"),
              name: other.name,
              text: pick(["我也在。", "这张好看。", "你又开始了。"], `${event.key}:text`),
              createdAt: event.createdAt + 60000
            });
          }
          const moment = {
            id: E.uid("moment"),
            characterId: character.id,
            content: event.text,
            image: "",
            likes: hashString(event.key) % 4,
            liked: false,
            comments,
            createdAt: event.createdAt,
            source: "life"
          };
          E.state.moments.push(moment);
          await E.db.put("moments", moment);
        } else if (event.type === "diary") {
          const entry = {
            id: E.uid("diary"),
            title: event.title || "今天",
            content: event.text,
            mood: event.mood || "平静",
            createdAt: event.createdAt,
            source: "life"
          };
          E.state.diary.push(entry);
          await E.db.put("diary", entry);
        } else if (event.type === "call") {
          const call = {
            id: E.uid("call"),
            characterId: character.id,
            type: "missed",
            duration: 0,
            createdAt: event.createdAt,
            source: "life"
          };
          E.state.calls.push(call);
          await E.db.put("calls", call);
        } else if (event.type === "message") {
          const chat = await E.ensureDirectChat(character.id);
          const message = {
            id: E.uid("msg"),
            chatId: chat.id,
            role: "assistant",
            characterId: character.id,
            content: event.text,
            createdAt: event.createdAt,
            source: "life"
          };
          E.state.messages.push(message);
          await E.saveMessage(message);
          chat.unread = (Number(chat.unread) || 0) + 1;
          chat.lastMessageAt = event.createdAt;
          await E.saveChat(chat);
          event.route = `#/chat/${chat.id}`;
        }

        if (!event.silent) {
          const notificationApp = {
            moment: "moments",
            call: "calls",
            message: "chat",
            diary: "diary"
          }[event.type] || "chat";
          await E.addNotification({
            title: character.name,
            body: event.type === "call" ? `未接来电 · ${event.text}` : event.text.slice(0, 90),
            app: notificationApp,
            route: event.route
          });
        }
      }
    },

    async settle(options) {
      const opts = options || {};
      const now = Number(opts.now) || Date.now();
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      const key = dayKey(now);
      if (life.dayKey !== key) {
        life.dayKey = key;
        life.todayCount = 0;
      }
      const elapsedMs = life.awayMs + (life.awaySince ? Math.max(0, now - life.awaySince) : 0);
      const config = E.lifeEngine.paceConfig(E.state.settings.lifePace);
      if (!E.state.settings.lifeEngine && !opts.force) {
        life.awayMs = 0;
        life.awaySince = now;
        life.lastSettledAt = now;
        await E.saveLifeState();
        return { events: [], elapsedMs, reason: "disabled" };
      }

      const result = E.lifeEngine.planBatch({
        now,
        elapsedMs,
        pace: E.state.settings.lifePace,
        characters: E.state.characters,
        chats: E.state.chats,
        todayCount: life.todayCount,
        existingKeys: life.recentKeys,
        seed: opts.seed || "",
        dnd: {
          enabled: !!E.state.settings.dndEnabled,
          start: E.state.settings.dndStart,
          end: E.state.settings.dndEnd
        }
      });

      if (result.events.length) {
        await E.lifeEngine.applyEvents(result.events);
        life.batch = result.events.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        life.todayCount += result.events.length;
        life.lastAwayMs = elapsedMs;
        life.recentKeys = life.recentKeys.concat(result.events.map((event) => event.key)).slice(-80);
        life.awayMs = 0;
      } else {
        life.awayMs = elapsedMs < config.gapMs ? elapsedMs : 0;
      }
      life.awaySince = now;
      life.lastSettledAt = now;
      await E.saveLifeState();
      return result;
    },

    async onBoot() {
      const now = Date.now();
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      if (life.awaySince) {
        life.awayMs += Math.max(0, now - life.awaySince);
      }
      life.awaySince = now;
      await E.saveLifeState();
      await E.lifeEngine.settle({ now, seed: "boot" });
    },

    async onHidden() {
      const now = Date.now();
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      if (!life.awaySince) life.awaySince = now;
      await E.saveLifeState();
    },

    async onVisible() {
      const now = Date.now();
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      if (life.awaySince) {
        life.awayMs += Math.max(0, now - life.awaySince);
        life.awaySince = now;
      }
      const result = await E.lifeEngine.settle({ now, seed: "visible" });
      if (result.events.length) {
        E.renderLockScreen();
        E.renderStatus();
        if (!E.state.locked) E.renderScreen();
      }
      return result;
    },

    async simulateAway(hours) {
      const amount = Math.max(1, Number(hours) || 3);
      if (!E.state.settings.lifeEngine) {
        E.toast("生活引擎已关闭，先打开上面的开关");
        return { events: [], reason: "disabled" };
      }
      const life = E.state.life = E.normalizeLifeState(E.state.life);
      life.awayMs += amount * HOUR;
      const result = await E.lifeEngine.settle({ now: Date.now(), seed: `manual:${amount}` });
      E.renderLockScreen();
      E.renderStatus();
      if (!E.state.locked) E.renderScreen();
      E.toast(result.events.length ? `已生成 ${result.events.length} 件离线事件` : "没有生成新事件，可能已达到每日上限");
      return result;
    }
  };

  E.showLifeRecap = function () {
    const life = E.state.life || {};
    const events = Array.isArray(life.batch) ? life.batch.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt)) : [];
    const body = events.length
      ? `
        <div class="life-recap-intro">${E.escapeHTML(E.lifeEngine.summaryText(events, life.lastAwayMs || 0))}</div>
        <div class="life-recap-list">
          ${events.map((event) => {
            const character = E.getCharacter(event.characterId);
            const icon = TYPE_ICONS[event.type] || "sparkles";
            const route = event.route || (event.type === "moment" ? "#/moments" : event.type === "diary" ? "#/diary" : event.type === "call" ? "#/calls" : "#/chat");
            return `
              <button class="life-recap-row" data-action="life-recap-open" data-route="${E.escapeHTML(route)}">
                <span class="life-recap-icon">${E.icon(icon, 16)}</span>
                <span class="grow">
                  <span class="life-recap-title">${E.escapeHTML(character ? character.name : event.characterName || "某个人")} · ${E.escapeHTML(TYPE_LABELS[event.type] || "小事")}</span>
                  <span class="life-recap-text">${E.escapeHTML(event.text || "")}</span>
                  <span class="life-recap-meta">${event.reason ? `<span class="life-recap-reason">${E.escapeHTML(event.reason)}</span>` : ""}<span class="life-recap-time">${E.fmtRelative(event.createdAt)}</span></span>
                </span>
              </button>
            `;
          }).join("")}
        </div>
      `
      : `<div class="empty"><div class="empty-icon">${E.icon("sparkles", 24)}</div><div class="empty-title">还没有离线事件</div><div class="empty-text">让角色在你离开时继续生活。去设置里调整频率，或者先模拟一次三小时的离开。</div><button class="btn soft" data-action="life-tick-now" style="margin-top:14px">${E.icon("sparkles", 16)} 模拟一次离开</button></div>`;
    E.openSheet({ title: "你不在的时候", body });
  };

  E.openLifeEvent = function (route) {
    E.closeSheet();
    if (route) E.navigate(route);
  };
})();
