(function () {
  "use strict";

  const E = window.Ember;

  E.DEFAULT_PROVIDER_CONFIGS = {
    demo: {
      baseUrl: "",
      apiKey: "",
      model: "本地演示",
      models: [],
      modelsFetchedAt: 0
    },
    openai: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      model: "gpt-4o-mini",
      models: [],
      modelsFetchedAt: 0
    },
    deepseek: {
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "",
      model: "deepseek-chat",
      models: [],
      modelsFetchedAt: 0
    },
    anthropic: {
      baseUrl: "https://api.anthropic.com",
      apiKey: "",
      model: "claude-3-5-sonnet-latest",
      models: [],
      modelsFetchedAt: 0
    },
    gemini: {
      baseUrl: "https://generativelanguage.googleapis.com",
      apiKey: "",
      model: "gemini-2.0-flash",
      models: [],
      modelsFetchedAt: 0
    },
    sillytavern: {
      baseUrl: "http://localhost:8000/v1",
      apiKey: "",
      model: "",
      models: [],
      modelsFetchedAt: 0
    },
    custom: {
      baseUrl: "",
      apiKey: "",
      model: "",
      models: [],
      modelsFetchedAt: 0
    }
  };

  E.DEFAULT_SETTINGS = {
    provider: "demo",
    providerConfigs: E.DEFAULT_PROVIDER_CONFIGS,
    userName: "我",
    theme: "light",
    themePack: "rose-frost",
    accent: "#c87f8a",
    autoSpeak: false,
    autoMemory: true,
    memoryRecallGate: true,
    segmentReplies: true,
    typingDelay: true,
    notifications: true,
    lifeEngine: true,
    lifePace: "normal",
    dndEnabled: false,
    dndStart: "23:00",
    dndEnd: "08:00",
    lastRoute: "#/home"
  };

  E.state = {
    ready: false,
    locked: true,
    route: "#/home",
    characters: [],
    chats: [],
    messages: [],
    moments: [],
    calls: [],
    gallery: [],
    diary: [],
    anniversaries: [],
    wallet: [],
    music: [],
    forum: [],
    memories: [],
    life: null,
    settings: JSON.parse(JSON.stringify(E.DEFAULT_SETTINGS)),
    notifications: [],
    activeChatId: null,
    generating: false,
    abortController: null,
    musicAudio: null,
    playingMusicId: null,
    characterTab: "persona",
    forumThreadId: null,
    callTimer: null,
    callSeconds: 0,
    callCharacterId: null,
    notificationOpen: false,
    memoryExtracting: {}
  };

  E.deepMergeSettings = function (saved) {
    const defaults = JSON.parse(JSON.stringify(E.DEFAULT_SETTINGS));
    const value = Object.assign({}, defaults, saved || {});
    value.providerConfigs = Object.assign({}, E.DEFAULT_PROVIDER_CONFIGS, (saved && saved.providerConfigs) || {});
    for (const key of Object.keys(E.DEFAULT_PROVIDER_CONFIGS)) {
      value.providerConfigs[key] = Object.assign({}, E.DEFAULT_PROVIDER_CONFIGS[key], value.providerConfigs[key] || {});
    }
    if (!value.themePack || !E.THEME_PACKS[value.themePack]) {
      value.themePack = value.theme === "dark" ? "moon-ink" : E.DEFAULT_THEME_PACK;
    }
    return value;
  };

  E.loadState = async function () {
    const storeNames = ["characters", "chats", "messages", "moments", "calls", "gallery", "diary", "anniversaries", "wallet", "music", "forum", "memories"];
    const loaded = {};
    for (const store of storeNames) {
      loaded[store] = await E.db.getAll(store);
    }
    const savedSettings = await E.db.getMeta("settings", null);
    const notifications = await E.db.getMeta("notifications", []);
    const lifeState = await E.db.getMeta("lifeState", null);
    const seeded = await E.db.getMeta("seeded", false);

    E.state.settings = E.deepMergeSettings(savedSettings);
    E.state.notifications = Array.isArray(notifications) ? notifications : [];
    E.state.life = E.normalizeLifeState(lifeState);
    for (const store of storeNames) {
      E.state[store] = Array.isArray(loaded[store]) ? loaded[store] : [];
    }
    E.state.characters = E.state.characters.map(E.normalizeCharacter);
    E.state.memories = E.state.memories.map((memory) => E.normalizeMemory(memory)).filter((memory) => memory.content);

    if (!seeded && E.state.characters.length === 0) {
      await E.seedData();
      await E.db.setMeta("seeded", true);
    }

    E.state.ready = true;
    E.applyTheme();
  };

  E.saveSettings = async function () {
    await E.db.setMeta("settings", E.state.settings);
  };

  E.saveNotifications = async function () {
    await E.db.setMeta("notifications", E.state.notifications);
  };

  E.getCharacter = function (id) {
    return E.state.characters.find((item) => item.id === id) || null;
  };

  E.getChat = function (id) {
    return E.state.chats.find((item) => item.id === id) || null;
  };

  E.getChatMessages = function (chatId) {
    return E.state.messages
      .filter((item) => item.chatId === chatId)
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
  };

  E.getLastMessage = function (chatId) {
    const rows = E.getChatMessages(chatId);
    return rows.length ? rows[rows.length - 1] : null;
  };

  E.chatTitle = function (chat) {
    if (!chat) return "聊天";
    if (chat.type === "group") return chat.title || "群聊";
    const character = E.getCharacter(chat.characterIds && chat.characterIds[0]);
    return character ? character.name : chat.title || "聊天";
  };

  E.chatAvatar = function (chat) {
    if (!chat) return null;
    if (chat.type === "group") return { name: chat.title || "群", color: "#8b6f8f", avatar: "" };
    return E.getCharacter(chat.characterIds && chat.characterIds[0]) || { name: "?", color: "#c87f8a", avatar: "" };
  };

  E.ensureDirectChat = async function (characterId) {
    let chat = E.state.chats.find((item) => item.type === "direct" && item.characterIds && item.characterIds[0] === characterId);
    if (chat) return chat;
    const character = E.getCharacter(characterId);
    chat = {
      id: E.uid("chat"),
      type: "direct",
      title: character ? character.name : "聊天",
      characterIds: [characterId],
      unread: 0,
      lastMessageAt: Date.now(),
      createdAt: Date.now()
    };
    E.state.chats.push(chat);
    await E.db.put("chats", chat);
    return chat;
  };

  E.ensureGroupChat = async function (characterIds, title) {
    const ids = Array.from(new Set((characterIds || []).filter(Boolean)));
    let chat = E.state.chats.find((item) => {
      if (item.type !== "group") return false;
      const current = (item.characterIds || []).slice().sort().join(",");
      return current === ids.slice().sort().join(",");
    });
    if (chat) return chat;
    chat = {
      id: E.uid("chat"),
      type: "group",
      title: title || "小群",
      characterIds: ids,
      unread: 0,
      lastMessageAt: Date.now(),
      createdAt: Date.now()
    };
    E.state.chats.push(chat);
    await E.db.put("chats", chat);
    return chat;
  };

  E.saveChat = async function (chat) {
    await E.db.put("chats", chat);
  };

  E.saveMessage = async function (message) {
    await E.db.put("messages", message);
  };

  E.addNotification = async function (notification) {
    if (!E.state.settings.notifications) return;
    const item = Object.assign({
      id: E.uid("notif"),
      createdAt: Date.now(),
      read: false
    }, notification);
    E.state.notifications.unshift(item);
    E.state.notifications = E.state.notifications.slice(0, 50);
    await E.saveNotifications();
    E.renderStatus();
    if (!E.state.locked) E.renderNotificationDrawer();
  };

  E.markChatRead = async function (chat) {
    if (!chat) return;
    if (chat.unread) {
      chat.unread = 0;
      await E.saveChat(chat);
    }
  };

  E.unreadTotal = function () {
    return E.state.chats.reduce((sum, chat) => sum + (Number(chat.unread) || 0), 0);
  };

  E.missedCalls = function () {
    return E.state.calls.filter((call) => call.type === "missed").length;
  };

  E.seedData = async function () {
    const now = Date.now();
    const linwan = {
      id: "char_linwan",
      name: "林晚",
      persona: "林晚，27 岁，独立书店店员，喜欢拍照和很苦的咖啡。\n她说话不快，偶尔会故意留半句，让人自己接。她不太擅长直接说想念，但会记住你随口提过的小事。\n她怕冷，阴天会穿一件过大的灰色针织衫。",
      greeting: "你终于出现了。今天过得怎么样？",
      example: "用户：今天有点累。\n林晚：那就先别说话。把手机放下，去倒杯水。我在这里。",
      relationship: "暧昧",
      color: "#c87f8a",
      avatar: "",
      tags: ["温柔", "慢热", "书店"],
      worldbook: [
        { id: "wb_linwan_1", title: "常去的店", content: "林晚工作的书店叫「留白」，在旧街拐角，下午四点后客人最少。" },
        { id: "wb_linwan_2", title: "小习惯", content: "她紧张时会用指腹摩挲杯沿，开心时会轻轻哼歌，但从不承认。" }
      ],
      createdAt: now - 86400000 * 20
    };
    const zhouxu = {
      id: "char_zhouxu",
      name: "周叙",
      persona: "周叙，29 岁，建筑事务所设计师，理性、克制，讲话有冷幽默。\n他习惯先听完再回答，不会轻易给建议。加班很多，但会记得回消息。\n他对旧建筑和路边招牌有奇怪的执念。",
      greeting: "路过你上次说的那家店，招牌换了。",
      example: "用户：你在干嘛？\n周叙：改图。第三版。\n周叙：现在觉得第一版最好。人类就是这样。",
      relationship: "旧友",
      color: "#6f7f9a",
      avatar: "",
      tags: ["冷静", "建筑", "冷幽默"],
      worldbook: [
        { id: "wb_zhouxu_1", title: "工作", content: "周叙在城西一家建筑事务所工作，最近在做一个旧剧院改造项目。" }
      ],
      createdAt: now - 86400000 * 18
    };
    const ali = {
      id: "char_ali",
      name: "阿梨",
      persona: "阿梨，24 岁，音乐平台编辑，精力旺盛，消息回得很快。\n她喜欢用感叹号，热衷安利新歌，擅长把尴尬场面搅成热闹。\n看起来没心没肺，其实很会看人脸色。",
      greeting: "今晚谁有空？我搞到两张 livehouse 的票。",
      example: "用户：我不太想出门。\n阿梨：那就不出门。我把歌单发你，窗户打开一点，假装现场。",
      relationship: "损友",
      color: "#c49a4a",
      avatar: "",
      tags: ["活泼", "音乐", "损友"],
      worldbook: [
        { id: "wb_ali_1", title: "歌单", content: "阿梨每周五更新一个叫「夜间飞行」的歌单，封面永远是一只歪掉的月亮。" }
      ],
      createdAt: now - 86400000 * 12
    };

    const characters = [linwan, zhouxu, ali];
    const chats = [
      {
        id: "chat_linwan",
        type: "direct",
        title: "林晚",
        characterIds: [linwan.id],
        unread: 1,
        lastMessageAt: now - 1000 * 60 * 8,
        createdAt: now - 86400000 * 10
      },
      {
        id: "chat_zhouxu",
        type: "direct",
        title: "周叙",
        characterIds: [zhouxu.id],
        unread: 0,
        lastMessageAt: now - 1000 * 60 * 48,
        createdAt: now - 86400000 * 9
      },
      {
        id: "chat_group",
        type: "group",
        title: "晚风三人组",
        characterIds: [linwan.id, zhouxu.id, ali.id],
        unread: 2,
        lastMessageAt: now - 1000 * 60 * 22,
        createdAt: now - 86400000 * 6
      }
    ];
    const messages = [
      { id: "msg_lw_1", chatId: "chat_linwan", role: "assistant", characterId: linwan.id, content: "你终于出现了。今天过得怎么样？", createdAt: now - 1000 * 60 * 18 },
      { id: "msg_lw_2", chatId: "chat_linwan", role: "user", content: "还行，就是有点累。", createdAt: now - 1000 * 60 * 14 },
      { id: "msg_lw_3", chatId: "chat_linwan", role: "assistant", characterId: linwan.id, content: "那就先别说话。把手机放下，去倒杯水。\n我在这里。", createdAt: now - 1000 * 60 * 8 },
      { id: "msg_zx_1", chatId: "chat_zhouxu", role: "assistant", characterId: zhouxu.id, content: "路过你上次说的那家店，招牌换了。", createdAt: now - 1000 * 60 * 50 },
      { id: "msg_zx_2", chatId: "chat_zhouxu", role: "user", content: "换成什么了？", createdAt: now - 1000 * 60 * 48 },
      { id: "msg_g_1", chatId: "chat_group", role: "assistant", characterId: ali.id, content: "今晚谁有空？我搞到两张 livehouse 的票。", createdAt: now - 1000 * 60 * 40 },
      { id: "msg_g_2", chatId: "chat_group", role: "assistant", characterId: zhouxu.id, content: "加班。你们去吧。", createdAt: now - 1000 * 60 * 34 },
      { id: "msg_g_3", chatId: "chat_group", role: "assistant", characterId: linwan.id, content: "我九点下班。如果还赶得上。", createdAt: now - 1000 * 60 * 22 }
    ];
    const moments = [
      {
        id: "moment_1",
        characterId: linwan.id,
        content: "下午的光很好，店里放了一首很旧的歌。\n有人站在门口看了很久，最后还是没有进来。",
        image: "",
        likes: 3,
        comments: [{ id: "cmt_1", name: "阿梨", text: "你又开始了。" }],
        createdAt: now - 1000 * 60 * 55
      },
      {
        id: "moment_2",
        characterId: zhouxu.id,
        content: "改图改到第三版，发现第一版最好。\n保留这个判断，明天再推翻一次。",
        image: "",
        likes: 1,
        comments: [],
        createdAt: now - 1000 * 60 * 60 * 5
      },
      {
        id: "moment_3",
        characterId: ali.id,
        content: "新歌单「夜间飞行」已更新。\n适合在回家的路上听，也适合假装自己正在回家。",
        image: "",
        likes: 5,
        comments: [],
        createdAt: now - 1000 * 60 * 60 * 9
      }
    ];
    const calls = [
      { id: "call_1", characterId: linwan.id, type: "missed", duration: 0, createdAt: now - 1000 * 60 * 70 }
    ];
    const diary = [
      {
        id: "diary_1",
        title: "把今天收起来",
        content: "下班路上没有戴耳机。\n风有点凉，便利店的灯比平时亮。\n回家以后才发现，今天其实没有发生什么大事，但也没有那么糟。",
        mood: "平静",
        createdAt: now - 1000 * 60 * 60 * 6
      }
    ];
    const anniversaries = [
      {
        id: "ann_1",
        title: "第一次一起看电影",
        date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 24).toISOString().slice(0, 10),
        note: "那天散场以后，谁都没有先走。",
        createdAt: now - 86400000 * 30
      }
    ];
    const wallet = [
      { id: "wal_1", type: "income", amount: 520, note: "稿费", createdAt: now - 86400000 * 2 },
      { id: "wal_2", type: "expense", amount: 38, note: "咖啡和面包", createdAt: now - 86400000 }
    ];
    const forum = [
      {
        id: "forum_1",
        title: "如果手机里的角色也会做梦",
        content: "她们会梦见白天说过的话吗？\n还是说，梦只是我们给空白找的解释。",
        author: "林晚",
        replies: [
          { id: "reply_1", author: "周叙", text: "梦是记忆的整理。没有记忆，就没有梦。", createdAt: now - 1000 * 60 * 60 * 3 },
          { id: "reply_2", author: "阿梨", text: "太理性了。也许她只是梦见了一杯没喝完的咖啡。", createdAt: now - 1000 * 60 * 60 * 2 }
        ],
        createdAt: now - 1000 * 60 * 60 * 8
      }
    ];
    const memories = [
      { id: "mem_1", characterId: linwan.id, content: "用户说过最近睡得不好，喜欢靠窗的位置。", importance: 4, source: "seed", pinned: false, createdAt: now - 86400000 * 3, updatedAt: now - 86400000 * 3 },
      { id: "mem_2", characterId: linwan.id, content: "用户不喜欢太吵的地方，但对旧书店有兴趣。", importance: 3, source: "seed", pinned: false, createdAt: now - 86400000 * 2, updatedAt: now - 86400000 * 2 },
      { id: "mem_3", characterId: zhouxu.id, content: "用户上次提到想去看旧剧院改造展。", importance: 3, source: "seed", pinned: false, createdAt: now - 86400000 * 4, updatedAt: now - 86400000 * 4 },
      { id: "mem_4", characterId: ali.id, content: "用户歌单里有很多慢歌，但不愿意承认。", importance: 2, source: "seed", pinned: false, createdAt: now - 86400000 * 5, updatedAt: now - 86400000 * 5 }
    ];
    const notifications = [
      { id: "notif_seed_1", title: "林晚", body: "那就先别说话。把手机放下，去倒杯水。", app: "chat", route: "#/chat/chat_linwan", read: false, createdAt: now - 1000 * 60 * 8 },
      { id: "notif_seed_2", title: "阿梨", body: "今晚谁有空？我搞到两张 livehouse 的票。", app: "chat", route: "#/chat/chat_group", read: false, createdAt: now - 1000 * 60 * 22 }
    ];

    await E.db.bulkPut("characters", characters);
    await E.db.bulkPut("chats", chats);
    await E.db.bulkPut("messages", messages);
    await E.db.bulkPut("moments", moments);
    await E.db.bulkPut("calls", calls);
    await E.db.bulkPut("diary", diary);
    await E.db.bulkPut("anniversaries", anniversaries);
    await E.db.bulkPut("wallet", wallet);
    await E.db.bulkPut("forum", forum);
    await E.db.bulkPut("memories", memories);
    await E.db.setMeta("notifications", notifications);
    await E.db.setMeta("settings", E.state.settings);

    E.state.characters = characters;
    E.state.chats = chats;
    E.state.messages = messages;
    E.state.moments = moments;
    E.state.calls = calls;
    E.state.diary = diary;
    E.state.anniversaries = anniversaries;
    E.state.wallet = wallet;
    E.state.forum = forum;
    E.state.memories = memories;
    E.state.notifications = notifications;
  };

  E.applyTheme = function () {
    const pack = E.currentThemePack() || E.THEME_PACKS[E.DEFAULT_THEME_PACK];
    const tokens = pack.tokens || {};
    E.state.settings.themePack = pack.id;
    E.state.settings.theme = pack.mode;
    E.state.settings.accent = pack.accent;
    document.body.dataset.theme = pack.mode === "dark" ? "dark" : "light";
    document.body.dataset.themePack = pack.id;
    const set = (name, value) => {
      if (value != null && value !== "") document.body.style.setProperty(name, value);
    };
    set("--accent", pack.accent);
    set("--accent-2", pack.accent2);
    set("--accent-soft", pack.accentSoft);
    set("--phone-bg", tokens.phoneBg);
    set("--card", tokens.card);
    set("--card-2", tokens.card2);
    set("--text", tokens.text);
    set("--muted", tokens.muted);
    set("--line", tokens.line);
    set("--press", tokens.press);
    set("--glass", tokens.glass);
    set("--glass-strong", tokens.glassStrong);
    set("--home-indicator", tokens.homeIndicator);
    set("--glass-border", tokens.glassBorder);
    set("--label-shadow", tokens.labelShadow);
    set("--shadow-sm", tokens.shadowSm);
    set("--home-overlay", tokens.homeOverlay);
    set("--lock-overlay", tokens.lockOverlay);
    if (pack.wallpaper) {
      set("--wallpaper", `url("${pack.wallpaper}")`);
    }
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", tokens.phoneBg || "#f4eee9");
  };
})();
