(function () {
  "use strict";

  const E = window.Ember;

  const AVAILABILITY_LABELS = {
    available: "方便",
    busy: "在忙",
    sleeping: "睡了"
  };

  const INTERRUPTIBILITY_LABELS = {
    low: "低",
    medium: "中",
    high: "高"
  };

  const PROACTIVE_MODE_LABELS = {
    inherit: "跟随全局",
    off: "关闭",
    quiet: "安静",
    normal: "正常",
    lively: "热闹"
  };

  E.LIFE_BLOCK_SETS = {
    default: [
      { start: "00:00", end: "07:00", activity: "睡觉", location: "家", mood: "困", availability: "sleeping", interruptibility: "low", replyStyle: "不会回", energy: 18 },
      { start: "07:00", end: "08:30", activity: "起床、洗漱", location: "家", mood: "还没醒", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 38 },
      { start: "08:30", end: "09:30", activity: "通勤", location: "路上", mood: "放空", availability: "busy", interruptibility: "low", replyStyle: "可能晚点回", energy: 48 },
      { start: "09:30", end: "12:00", activity: "上班", location: "公司", mood: "专注", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 55 },
      { start: "12:00", end: "13:00", activity: "午休", location: "公司附近", mood: "松一点", availability: "available", interruptibility: "medium", replyStyle: "正常", energy: 62 },
      { start: "13:00", end: "18:00", activity: "上班", location: "公司", mood: "有点累", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 45 },
      { start: "18:00", end: "19:30", activity: "下班、吃饭", location: "路上", mood: "松下来", availability: "available", interruptibility: "medium", replyStyle: "正常", energy: 55 },
      { start: "19:30", end: "23:00", activity: "自由时间", location: "家", mood: "安静", availability: "available", interruptibility: "high", replyStyle: "可以多聊", energy: 64 },
      { start: "23:00", end: "24:00", activity: "洗漱、准备睡", location: "家", mood: "困", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 32 }
    ],
    bookstore: [
      { start: "00:00", end: "08:00", activity: "睡觉", location: "家", mood: "困", availability: "sleeping", interruptibility: "low", replyStyle: "不会回", energy: 18 },
      { start: "08:00", end: "09:30", activity: "起床、去书店", location: "路上", mood: "还没醒", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 38 },
      { start: "09:30", end: "18:00", activity: "在书店看店", location: "留白书店", mood: "安静", availability: "busy", interruptibility: "low", replyStyle: "回得慢", energy: 52 },
      { start: "18:00", end: "19:00", activity: "收店、整理书架", location: "留白书店", mood: "有点累", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 42 },
      { start: "19:00", end: "20:00", activity: "吃晚饭", location: "旧街", mood: "松下来", availability: "available", interruptibility: "medium", replyStyle: "正常", energy: 56 },
      { start: "20:00", end: "23:00", activity: "自由时间", location: "家", mood: "安静", availability: "available", interruptibility: "high", replyStyle: "可以多聊", energy: 64 },
      { start: "23:00", end: "24:00", activity: "洗漱、准备睡", location: "家", mood: "困", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 32 }
    ],
    office: [
      { start: "00:00", end: "07:30", activity: "睡觉", location: "家", mood: "困", availability: "sleeping", interruptibility: "low", replyStyle: "不会回", energy: 18 },
      { start: "07:30", end: "09:00", activity: "通勤", location: "路上", mood: "还没醒", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 40 },
      { start: "09:00", end: "12:30", activity: "改图", location: "事务所", mood: "专注", availability: "busy", interruptibility: "low", replyStyle: "回得慢", energy: 54 },
      { start: "12:30", end: "13:30", activity: "吃午饭", location: "事务所附近", mood: "松一点", availability: "available", interruptibility: "medium", replyStyle: "正常", energy: 62 },
      { start: "13:30", end: "19:30", activity: "改图、开会", location: "事务所", mood: "有点累", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 42 },
      { start: "19:30", end: "21:00", activity: "下班、吃晚饭", location: "路上", mood: "松下来", availability: "available", interruptibility: "medium", replyStyle: "正常", energy: 55 },
      { start: "21:00", end: "23:30", activity: "自由时间", location: "家", mood: "安静", availability: "available", interruptibility: "high", replyStyle: "可以多聊", energy: 62 },
      { start: "23:30", end: "24:00", activity: "洗漱、准备睡", location: "家", mood: "困", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 30 }
    ],
    music: [
      { start: "00:00", end: "09:00", activity: "睡觉", location: "家", mood: "困", availability: "sleeping", interruptibility: "low", replyStyle: "不会回", energy: 18 },
      { start: "09:00", end: "10:00", activity: "起床、听歌", location: "家", mood: "慢慢醒", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 40 },
      { start: "10:00", end: "19:00", activity: "编辑歌单、写稿", location: "音乐平台", mood: "专注", availability: "busy", interruptibility: "low", replyStyle: "回得慢", energy: 52 },
      { start: "19:00", end: "20:00", activity: "吃晚饭", location: "公司附近", mood: "松下来", availability: "available", interruptibility: "medium", replyStyle: "正常", energy: 58 },
      { start: "20:00", end: "23:30", activity: "自由时间", location: "家或 livehouse", mood: "精神", availability: "available", interruptibility: "high", replyStyle: "可以多聊", energy: 68 },
      { start: "23:30", end: "24:00", activity: "洗漱、准备睡", location: "家", mood: "困", availability: "busy", interruptibility: "low", replyStyle: "短句", energy: 32 }
    ]
  };

  function clockMinutes(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour === 24 && minute === 0) return 24 * 60;
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function scheduleType(character) {
    const text = `${character && character.scheduleType ? character.scheduleType : ""} ${
      character && Array.isArray(character.tags) ? character.tags.join(" ") : ""
    } ${character && character.persona ? character.persona : ""} ${
      character && character.relationship ? character.relationship : ""
    }`;
    if (/书店|图书|阅读|留白/.test(text)) return "bookstore";
    if (/建筑|设计|改图|事务所|工程/.test(text)) return "office";
    if (/音乐|歌单|乐队|livehouse|编辑/.test(text)) return "music";
    return "default";
  }

  function blockAt(schedule, timestamp) {
    const date = new Date(timestamp);
    const current = date.getHours() * 60 + date.getMinutes();
    for (let index = 0; index < schedule.length; index += 1) {
      const block = schedule[index];
      const start = clockMinutes(block.start);
      const end = clockMinutes(block.end);
      if (start === null || end === null) continue;
      if (end > start) {
        if (current >= start && current < end) return { block, index };
      } else if (current >= start || current < end) {
        return { block, index };
      }
    }
    return { block: schedule[0], index: 0 };
  }

  function blockStartAt(schedule, index, timestamp) {
    const block = schedule[index % schedule.length];
    const start = clockMinutes(block.start);
    if (start === null) return 0;
    const date = new Date(timestamp);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    target.setMinutes(start);
    if (target.getTime() <= timestamp) target.setDate(target.getDate() + 1);
    return target.getTime();
  }

  function nextBlockInfo(schedule, currentIndex, timestamp) {
    const index = (currentIndex + 1) % schedule.length;
    const block = schedule[index];
    return {
      block,
      index,
      at: blockStartAt(schedule, index, timestamp)
    };
  }

  function nextAvailableInfo(schedule, currentIndex, timestamp) {
    for (let offset = 1; offset <= schedule.length; offset += 1) {
      const index = (currentIndex + offset) % schedule.length;
      const block = schedule[index];
      if (block.availability !== "sleeping" && block.interruptibility !== "low") {
        return {
          block,
          index,
          at: blockStartAt(schedule, index, timestamp)
        };
      }
    }
    return nextBlockInfo(schedule, currentIndex, timestamp);
  }

  function statusLine(block) {
    if (!block) return "状态未知";
    if (block.availability === "sleeping") return "已经睡了 · 明天再回";
    if (block.availability === "busy") return `${block.activity} · 回得慢`;
    return `${block.activity} · 现在方便回`;
  }

  function shortLine(block) {
    if (!block) return "";
    if (block.availability === "sleeping") return "睡了";
    if (block.availability === "busy") return `${block.activity} · 在忙`;
    return `${block.activity} · 方便`;
  }

  E.scheduleTypeForCharacter = scheduleType;
  E.proactiveModeLabel = function (mode) {
    return PROACTIVE_MODE_LABELS[mode] || PROACTIVE_MODE_LABELS.inherit;
  };

  E.lifeBlockSetFor = function (character) {
    const type = scheduleType(character || {});
    return E.LIFE_BLOCK_SETS[type] || E.LIFE_BLOCK_SETS.default;
  };

  E.characterStateFor = function (character, at) {
    if (!character) return null;
    const now = Number(at) || Date.now();
    const schedule = E.lifeBlockSetFor(character);
    const current = blockAt(schedule, now);
    const next = nextBlockInfo(schedule, current.index, now);
    const nextAvailable = nextAvailableInfo(schedule, current.index, now);
    const block = current.block;
    return {
      characterId: character.id || "",
      scheduleType: scheduleType(character),
      block,
      blockIndex: current.index,
      activity: block.activity,
      location: block.location,
      mood: block.mood,
      energy: Number(block.energy) || 0,
      availability: block.availability,
      interruptibility: block.interruptibility,
      replyStyle: block.replyStyle,
      availabilityLabel: AVAILABILITY_LABELS[block.availability] || "未知",
      interruptibilityLabel: INTERRUPTIBILITY_LABELS[block.interruptibility] || "未知",
      statusLine: statusLine(block),
      shortLine: shortLine(block),
      isSleeping: block.availability === "sleeping",
      canInterrupt: block.availability !== "sleeping" && block.interruptibility !== "low",
      nextBlock: next.block,
      nextBlockAt: next.at,
      nextAvailableBlock: nextAvailable.block,
      nextAvailableAt: nextAvailable.at,
      updatedAt: now
    };
  };

  E.characterStatusLine = function (character, at) {
    const state = E.characterStateFor(character, at);
    return state ? state.statusLine : "";
  };

  E.characterStatusShort = function (character, at) {
    const state = E.characterStateFor(character, at);
    return state ? state.shortLine : "";
  };
})();
