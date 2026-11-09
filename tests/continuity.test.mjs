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
    "src/js/02e-continuity.js"
  ]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  }
  return context.window.Ember;
}

const E = loadEmber();
E.saveLifeState = async () => {};
E.db.put = async () => {};

function reset() {
  E.state.characters = [
    E.normalizeCharacter({ id: "char_a", name: "林晚", relationship: "暧昧", tags: ["书店"], persona: "独立书店店员" }),
    E.normalizeCharacter({ id: "char_b", name: "阿梨", relationship: "损友", tags: ["音乐"], persona: "音乐编辑" })
  ];
  E.state.chats = [{
    id: "chat_group",
    type: "group",
    title: "晚风",
    characterIds: ["char_a", "char_b"]
  }];
  E.state.life = E.normalizeLifeState(null);
  E.state.settings = JSON.parse(JSON.stringify(E.DEFAULT_SETTINGS));
  E.state.ready = true;
}

test("生活状态会补齐承诺、剧情线、手机痕迹和角色关系", () => {
  reset();
  const life = E.normalizeLifeState({
    commitments: [{ characterId: "char_a", content: "明天一起吃饭" }],
    storylines: [{ characterId: "char_a", title: "旧书店盘点周" }],
    herPhone: { char_a: { memos: [{ title: "买牛奶" }] } },
    bonds: [{ a: "char_a", b: "char_b" }]
  });
  assert.equal(life.commitments.length, 1);
  assert.equal(life.storylines.length, 1);
  assert.equal(life.herPhone.char_a.memos.length, 1);
  assert.equal(life.bonds.length, 1);
  assert.ok(E.getCharacter("char_a").relationshipState);
});

test("聊天里的未来约定会被本地抽取", () => {
  const now = new Date(2026, 10, 9, 18, 0, 0).getTime();
  const rows = E.commitmentEngine.extract("明天晚上一起吃饭，别忘了。还有周末把书还给你。", now);
  assert.equal(rows.length, 2);
  assert.ok(rows[0].content.includes("吃饭"));
  assert.ok(rows[0].dueAt > now);
  assert.ok(rows[1].content.includes("书"));
});

test("关系温度会记录冲突和修复", () => {
  reset();
  const character = E.getCharacter("char_a");
  const before = E.relationshipEngine.stateFor(character);
  E.relationshipEngine.observe("char_a", "你根本不理解我，我很失望。", "user", Date.now());
  const tense = E.relationshipEngine.stateFor(character);
  assert.ok(tense.tension > before.tension);
  assert.ok(tense.unresolvedTopic);
  E.relationshipEngine.observe("char_a", "对不起，是我不好，我们聊聊。", "user", Date.now() + 1000);
  const repaired = E.relationshipEngine.stateFor(character);
  assert.ok(repaired.tension < tense.tension);
  assert.ok(repaired.lastRepairAt > 0);
});

test("剧情线会生成跨天片段，并让动态和日记共享来源", () => {
  reset();
  const now = new Date(2026, 10, 9, 20, 0, 0).getTime();
  const story = E.storylineEngine.ensureFor(E.getCharacter("char_a"), now);
  assert.ok(story.durationDays >= 3 && story.durationDays <= 7);
  const events = E.storylineEngine.materialize({
    now,
    elapsedMs: 4 * 60 * 60 * 1000,
    characters: E.state.characters,
    todayCount: 0,
    maxPerDay: 5,
    existingKeys: []
  });
  assert.ok(events.length >= 1);
  assert.ok(events.every((event) => event.sourceEventId));
  assert.equal(new Set(events.map((event) => event.sourceEventId)).size, 1);
  assert.ok(events.some((event) => event.type === "diary") || events.some((event) => event.type === "moment"));
  const moment = events.find((event) => event.type === "moment");
  assert.ok(moment);
  assert.equal(E.characterInteractionEngine.canSee(moment, "char_b"), true);
});

test("生活事件会留下她的手机痕迹", () => {
  reset();
  const character = E.getCharacter("char_a");
  const before = E.herPhoneEngine.summary(character.id).total;
  E.herPhoneEngine.ingestEvent({
    id: "life_test",
    key: "life:test",
    type: "moment",
    text: "今天在旧书店门口站了一会儿。",
    createdAt: Date.now(),
    sourceEventId: "story:test:0"
  }, character);
  const after = E.herPhoneEngine.summary(character.id);
  assert.ok(after.total > before);
  assert.ok(E.herPhoneEngine.itemsFor(character.id, "history").some((item) => item.sourceEventId === "story:test:0"));
});

test("第一次打开摘要时会给她的手机补齐基础痕迹", () => {
  reset();
  const summary = E.herPhoneEngine.summary("char_a");
  assert.ok(summary.total >= 6);
  assert.ok(summary.memos >= 2);
  assert.ok(summary.history >= 2);
  assert.ok(summary.drafts >= 1);
  assert.ok(summary.cart >= 1);
});

test("群聊里的角色会看见动态并接话", () => {
  reset();
  const event = {
    id: "life_moment",
    key: "life:moment",
    type: "moment",
    characterId: "char_a",
    text: "今天店里来了一个很安静的客人。",
    createdAt: Date.now(),
    visibleTo: ["char_a", "char_b"]
  };
  const comments = E.characterInteractionEngine.commentsFor(event, E.getCharacter("char_a"), E.state.characters);
  assert.ok(comments.length >= 1);
  assert.equal(comments[0].characterId, "char_b");
  assert.ok(comments[0].text);
  assert.equal(E.characterInteractionEngine.canSee(event, "char_b"), true);
  assert.equal(E.characterInteractionEngine.canSee({ visibleTo: ["char_a"] }, "char_b"), false);
});

test("承诺可以手动完成并进入关系时间线", async () => {
  reset();
  const item = E.commitmentEngine.add("char_a", {
    content: "周五把书还给她",
    dueAt: Date.now() + 24 * 60 * 60 * 1000
  });
  assert.ok(item.id);
  await E.commitmentEngine.complete(item.id);
  assert.equal(E.commitmentEngine.listFor("char_a")[0].status, "done");
  assert.ok(E.relationshipEngine.timeline("char_a").some((row) => row.type === "commitment"));
});

test("群聊里的用户消息会同时被多个角色听见", async () => {
  reset();
  const beforeA = E.relationshipEngine.stateFor(E.getCharacter("char_a")).closeness;
  const beforeB = E.relationshipEngine.stateFor(E.getCharacter("char_b")).closeness;
  await E.relationshipEngine.observeMessage({
    id: "chat_group",
    type: "group",
    characterIds: ["char_a", "char_b"]
  }, {
    id: "msg_group_user",
    chatId: "chat_group",
    role: "user",
    content: "谢谢你们，今天真的很开心。",
    createdAt: Date.now()
  });
  assert.ok(E.relationshipEngine.stateFor(E.getCharacter("char_a")).closeness > beforeA);
  assert.ok(E.relationshipEngine.stateFor(E.getCharacter("char_b")).closeness > beforeB);
});

test("删除角色会清掉约定、剧情线、手机痕迹和角色关系", () => {
  reset();
  const character = E.getCharacter("char_a");
  E.commitmentEngine.add("char_a", { content: "明天把书还给她", dueAt: Date.now() + 86400000 });
  E.storylineEngine.ensureFor(character, Date.now());
  E.herPhoneEngine.stateFor("char_a");
  E.characterInteractionEngine.ensureBonds();
  E.state.life.intents.push(E.normalizeProactiveIntent({ characterId: "char_a" }));
  E.state.life.batch.push({
    id: "life_cleanup",
    key: "life:cleanup",
    type: "diary",
    characterId: "char_a",
    text: "清理测试",
    createdAt: Date.now()
  });
  E.state.life.proactive.char_a = { count: 1 };

  E.continuity.removeCharacterData("char_a");

  assert.equal(E.state.life.commitments.length, 0);
  assert.equal(E.state.life.storylines.length, 0);
  assert.equal(E.state.life.herPhone.char_a, undefined);
  assert.equal(E.state.life.bonds.length, 0);
  assert.equal(E.state.life.intents.length, 0);
  assert.equal(E.state.life.batch.length, 0);
  assert.equal(E.state.life.proactive.char_a, undefined);
});
