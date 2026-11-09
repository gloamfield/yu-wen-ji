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
  for (const file of ["src/js/01-core.js", "src/js/02-state.js", "src/js/02b-life-engine.js"]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  }
  return context.window.Ember;
}

const E = loadEmber();
const characters = [
  { id: "char_a", name: "林晚", relationship: "暧昧", tags: ["书店"], persona: "独立书店店员" },
  { id: "char_b", name: "阿梨", relationship: "损友", tags: ["音乐"], persona: "音乐编辑" }
];

test("生活状态会补齐默认字段", () => {
  const life = E.normalizeLifeState(null);
  assert.equal(life.awayMs, 0);
  assert.equal(life.todayCount, 0);
  assert.deepEqual(Array.from(life.batch), []);
  assert.deepEqual(Array.from(life.recentKeys), []);
});

test("离开时间不足一个间隔时不会生成事件", () => {
  const result = E.lifeEngine.planBatch({
    now: 1000000,
    elapsedMs: 30 * 60 * 1000,
    pace: "normal",
    characters
  });
  assert.equal(result.events.length, 0);
  assert.equal(result.reason, "too-soon");
});

test("正常节奏下一次回来最多结算两件事件", () => {
  const result = E.lifeEngine.planBatch({
    now: 100000000,
    elapsedMs: 6 * 60 * 60 * 1000,
    pace: "normal",
    characters
  });
  assert.equal(result.events.length, 2);
  assert.ok(result.events.every((event) => event.characterId && event.text));
  assert.ok(result.events.every((event) => ["moment", "diary", "call", "message"].includes(event.type)));
});

test("每日上限会阻止继续生成事件", () => {
  const result = E.lifeEngine.planBatch({
    now: 100000000,
    elapsedMs: 12 * 60 * 60 * 1000,
    pace: "normal",
    characters,
    todayCount: 5
  });
  assert.equal(result.events.length, 0);
  assert.equal(result.reason, "daily-cap");
});

test("相同时间槽的事件会被去重", () => {
  const first = E.lifeEngine.planBatch({
    now: 100000000,
    elapsedMs: 6 * 60 * 60 * 1000,
    pace: "normal",
    characters
  });
  const second = E.lifeEngine.planBatch({
    now: 100000000,
    elapsedMs: 6 * 60 * 60 * 1000,
    pace: "normal",
    characters,
    existingKeys: first.events.map((event) => event.key)
  });
  assert.equal(second.events.length, 0);
  assert.equal(second.reason, "duplicate");
});

test("摘要会按事件类型统计", () => {
  const text = E.lifeEngine.summaryText([
    { type: "moment" },
    { type: "call" },
    { type: "call" }
  ], 2 * 60 * 60 * 1000);
  assert.equal(text, "你不在的 2 小时里，1 条动态、2 通未接来电。");
});

test("深夜只会留下动态或日记，不会发消息和未接来电", () => {
  const night = new Date(2026, 10, 9, 2, 0, 0).getTime();
  const result = E.lifeEngine.planBatch({
    now: night,
    elapsedMs: 6 * 60 * 60 * 1000,
    pace: "lively",
    characters
  });
  assert.ok(result.events.length > 0);
  assert.ok(result.events.every((event) => ["moment", "diary"].includes(event.type)));
});

test("每个生活事件都会带一条发生原因", () => {
  const result = E.lifeEngine.planBatch({
    now: 100000000,
    elapsedMs: 6 * 60 * 60 * 1000,
    pace: "normal",
    characters
  });
  assert.ok(result.events.length > 0);
  assert.ok(result.events.every((event) => typeof event.reason === "string" && event.reason.length > 0));
  assert.ok(result.events.every((event) => event.reason.includes("没说话")));
});

test("勿扰时段支持跨午夜判断", () => {
  const dnd = { enabled: true, start: "23:00", end: "08:00" };
  assert.equal(E.lifeEngine.inDndWindow(new Date(2026, 10, 9, 22, 59).getTime(), dnd), false);
  assert.equal(E.lifeEngine.inDndWindow(new Date(2026, 10, 9, 23, 0).getTime(), dnd), true);
  assert.equal(E.lifeEngine.inDndWindow(new Date(2026, 10, 10, 3, 30).getTime(), dnd), true);
  assert.equal(E.lifeEngine.inDndWindow(new Date(2026, 10, 10, 7, 59).getTime(), dnd), true);
  assert.equal(E.lifeEngine.inDndWindow(new Date(2026, 10, 10, 8, 0).getTime(), dnd), false);
  assert.equal(E.lifeEngine.inDndWindow(new Date(2026, 10, 9, 23, 0).getTime(), { enabled: false, start: "23:00", end: "08:00" }), false);
});

test("勿扰时段只生成动态或日记，并标记为静默", () => {
  const now = new Date(2026, 10, 9, 4, 0, 0).getTime();
  const result = E.lifeEngine.planBatch({
    now,
    elapsedMs: 6 * 60 * 60 * 1000,
    pace: "normal",
    characters,
    dnd: { enabled: true, start: "23:00", end: "08:00" }
  });
  assert.equal(result.events.length, 2);
  assert.ok(result.events.every((event) => ["moment", "diary"].includes(event.type)));
  assert.ok(result.events.every((event) => event.silent === true));
  assert.ok(result.events.every((event) => event.reason.includes("勿扰时段")));
});

test("勿扰时段关闭时不会标记静默", () => {
  const now = new Date(2026, 10, 9, 4, 0, 0).getTime();
  const result = E.lifeEngine.planBatch({
    now,
    elapsedMs: 6 * 60 * 60 * 1000,
    pace: "normal",
    characters,
    dnd: { enabled: false, start: "23:00", end: "08:00" }
  });
  assert.ok(result.events.every((event) => event.silent === false));
});
