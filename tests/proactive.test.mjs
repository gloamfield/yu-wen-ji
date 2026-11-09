import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadEmber() {
  const context = {
    window: {},
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    String,
    Number,
    Array,
    Object,
    Set,
    Map
  };
  context.window.window = context.window;
  vm.createContext(context);
  for (const file of [
    "src/js/01-core.js",
    "src/js/02-state.js",
    "src/js/02b-life-engine.js",
    "src/js/02c-life-state.js",
    "src/js/02d-proactive.js"
  ]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  }
  return context.window.Ember;
}

const E = loadEmber();

function reset(now) {
  E.state.ready = true;
  E.state.settings = Object.assign(JSON.parse(JSON.stringify(E.DEFAULT_SETTINGS)), {
    proactiveEnabled: true,
    proactivePace: "normal",
    proactiveUseModel: false,
    dndEnabled: false,
    dndStart: "23:00",
    dndEnd: "08:00"
  });
  E.state.characters = [
    E.normalizeCharacter({
      id: "char_a",
      name: "林晚",
      relationship: "暧昧",
      tags: ["书店"],
      persona: "独立书店店员"
    })
  ];
  E.state.chats = [
    {
      id: "chat_a",
      type: "direct",
      title: "林晚",
      characterIds: ["char_a"],
      unread: 0,
      lastMessageAt: now - 2 * 60 * 60 * 1000
    }
  ];
  E.state.messages = [
    {
      id: "msg_old",
      chatId: "chat_a",
      role: "user",
      content: "今天有点忙",
      createdAt: now - 2 * 60 * 60 * 1000
    }
  ];
  E.state.memories = [];
  E.state.life = E.normalizeLifeState(null);
  E.saveLifeState = async () => {};
  E.saveMessage = async () => {};
  E.saveChat = async () => {};
  E.addNotification = async () => {};
  E.renderStatus = () => {};
  E.renderLockScreen = () => {};
  E.renderNotificationDrawer = () => {};
  E.parseRoute = () => ({ name: "home", args: [] });
  E.activeProvider = () => "demo";
  E.PROVIDERS = { demo: { kind: "demo" } };
  return E.getCharacter("char_a");
}

function intentAt(now, characterId = "char_a", extra = {}) {
  return E.normalizeProactiveIntent({
    id: "intent_test",
    characterId,
    dueAt: now - 1000,
    expiresAt: now + 2 * 60 * 60 * 1000,
    reason: "care",
    status: "pending",
    ...extra
  });
}

test("日程跨午夜时仍能判断睡觉和可打扰度", () => {
  const character = E.normalizeCharacter({
    id: "char_night",
    name: "夜班",
    tags: ["书店"],
    persona: "独立书店店员"
  });
  const night = new Date(2026, 10, 9, 3, 0, 0).getTime();
  const evening = new Date(2026, 10, 9, 20, 0, 0).getTime();
  const sleeping = E.characterStateFor(character, night);
  const available = E.characterStateFor(character, evening);
  assert.equal(sleeping.availability, "sleeping");
  assert.equal(sleeping.canInterrupt, false);
  assert.ok(sleeping.nextAvailableAt > night);
  assert.equal(available.availability, "available");
  assert.equal(available.canInterrupt, true);
});

test("未到时间的意图不会发送", () => {
  const now = new Date(2026, 10, 9, 21, 0, 0).getTime();
  reset(now);
  const result = E.proactiveEngine.evaluateIntent(intentAt(now, "char_a", { dueAt: now + 5 * 60 * 1000 }), now);
  assert.equal(result.allowed, false);
  assert.equal(result.suppressedBy, "not-due");
});

test("勿扰时段会阻止主动消息", () => {
  const now = new Date(2026, 10, 9, 23, 30, 0).getTime();
  reset(now);
  E.state.settings.dndEnabled = true;
  const result = E.proactiveEngine.evaluateIntent(intentAt(now), now);
  assert.equal(result.allowed, false);
  assert.equal(result.suppressedBy, "quiet-hours");
  assert.ok(result.nextEligibleAt > now);
});

test("角色不方便时会按当前日程延后", () => {
  const now = new Date(2026, 10, 9, 10, 0, 0).getTime();
  reset(now);
  const result = E.proactiveEngine.evaluateIntent(intentAt(now), now);
  assert.equal(result.allowed, false);
  assert.equal(result.suppressedBy, "low-interruptibility");
  assert.ok(result.nextEligibleAt > now);
});

test("用户刚说完话时不会插进来", () => {
  const now = new Date(2026, 10, 9, 21, 0, 0).getTime();
  reset(now);
  E.state.messages[0].createdAt = now - 5 * 60 * 1000;
  const result = E.proactiveEngine.evaluateIntent(intentAt(now), now);
  assert.equal(result.allowed, false);
  assert.equal(result.suppressedBy, "recent-user");
});

test("冷却和每日上限会分别阻止主动消息", () => {
  const now = new Date(2026, 10, 9, 21, 0, 0).getTime();
  reset(now);
  E.state.settings.proactivePace = "lively";
  E.state.life.proactive.char_a = {
    dayKey: "2026-11-09",
    count: 0,
    lastSentAt: now - 10 * 60 * 1000,
    lastReason: "care",
    lastSuppressedBy: "",
    lastEvaluatedAt: 0,
    nextEligibleAt: 0
  };
  const cooldown = E.proactiveEngine.evaluateIntent(intentAt(now), now);
  assert.equal(cooldown.allowed, false);
  assert.equal(cooldown.suppressedBy, "cooldown");

  E.state.life.proactive.char_a.count = 5;
  const capped = E.proactiveEngine.evaluateIntent(intentAt(now), now);
  assert.equal(capped.allowed, false);
  assert.equal(capped.suppressedBy, "daily-cap");
});

test("角色主动模式关闭时不会进入队列", () => {
  const now = new Date(2026, 10, 9, 21, 0, 0).getTime();
  const character = reset(now);
  character.proactiveMode = "off";
  assert.equal(E.proactiveEngine.ensureIntent(character, now), null);
});

test("重复 tick 不会重复发送同一条主动消息", async () => {
  const now = new Date(2026, 10, 9, 21, 0, 0).getTime();
  reset(now);
  E.state.life.intents = [intentAt(now)];
  const first = await E.proactiveEngine.tick(now);
  assert.ok(first.sent);
  const second = await E.proactiveEngine.tick(now + 1000);
  assert.equal(second.sent, null);
  assert.equal(E.state.messages.filter((message) => message.source === "proactive").length, 1);
  assert.equal(E.state.life.proactive.char_a.count, 1);
});

test("按角色评估时不会发送其他角色的待发意图", async () => {
  const now = new Date(2026, 10, 9, 21, 0, 0).getTime();
  reset(now);
  E.state.characters.push(E.normalizeCharacter({
    id: "char_b",
    name: "周野",
    relationship: "朋友",
    tags: ["电台"],
    persona: "夜间电台主持"
  }));
  E.state.chats.push({
    id: "chat_b",
    type: "direct",
    title: "周野",
    characterIds: ["char_b"],
    unread: 0,
    lastMessageAt: now - 2 * 60 * 60 * 1000
  });
  E.state.life.intents = [
    intentAt(now, "char_a", { id: "intent_a" }),
    intentAt(now, "char_b", { id: "intent_b" })
  ];
  const result = await E.proactiveEngine.tick(now, { characterId: "char_a" });
  assert.ok(result.sent);
  assert.equal(result.sent.characterId, "char_a");
  assert.equal(E.state.messages.filter((message) => message.source === "proactive").length, 1);
  assert.equal(E.state.life.proactive.char_a.count, 1);
  assert.equal(E.state.life.proactive.char_b, undefined);
  assert.ok(E.state.life.intents.some((intent) => intent.id === "intent_b" && intent.status === "pending"));
});

test("用户发言会把待发意图推到最近聊天之后", async () => {
  const now = new Date(2026, 10, 9, 21, 0, 0).getTime();
  reset(now);
  E.state.life.intents = [intentAt(now)];
  await E.proactiveEngine.onUserMessage(E.state.chats[0], now);
  const pending = E.state.life.intents[0];
  assert.equal(pending.suppressedBy, "recent-user");
  assert.ok(pending.dueAt >= now + 25 * 60 * 1000);
  assert.ok(E.state.life.proactive.char_a.nextEligibleAt >= now + 25 * 60 * 1000);
});
