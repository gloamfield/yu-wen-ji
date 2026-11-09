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
    URL,
    fetch: () => {},
    TextDecoder,
    DOMException
  };
  context.window.window = context.window;
  vm.createContext(context);
  for (const file of ["src/js/01-core.js", "src/js/03-providers.js"]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  }
  return context.window.Ember;
}

const E = loadEmber();

test("本地记忆会按分句提取多个事实", () => {
  const rows = E.localMemoryCandidates("我最近总是睡不好，喜欢靠窗的位置。");
  assert.deepEqual(Array.from(rows, (row) => row.content), [
    "用户最近睡不好",
    "用户喜欢靠窗的位置"
  ]);
});

test("记忆提取不会误删名词末尾的“吧”", () => {
  const rows = E.localMemoryCandidates("我喜欢海边的风，讨厌很吵的酒吧。");
  assert.deepEqual(Array.from(rows, (row) => row.content), [
    "用户喜欢海边的风",
    "用户不喜欢很吵的酒吧"
  ]);
});

test("同义睡眠表达会归一到同一个比较键", () => {
  const seed = E.canonicalMemoryText("用户说过最近睡得不好，喜欢靠窗的位置。");
  const auto = E.canonicalMemoryText("用户最近总是睡不好");
  assert.equal(seed, "睡眠差喜欢靠窗位置");
  assert.equal(auto, "睡眠差");
  assert.equal(E.isDuplicateMemory([seed], auto), true);
});

test("已有记忆覆盖新事实时不会重复写入", () => {
  const seed = E.canonicalMemoryText("用户说过最近睡得不好，喜欢靠窗的位置。");
  assert.equal(E.isDuplicateMemory([seed], E.canonicalMemoryText("用户喜欢靠窗的位置")), true);
  assert.equal(E.isDuplicateMemory([seed], E.canonicalMemoryText("用户喜欢雨天")), false);
});

test("解析器保留最多五条候选并兼容空响应", () => {
  const raw = JSON.stringify([
    { content: "用户喜欢猫" },
    { content: "用户喜欢狗" },
    { content: "用户喜欢雨天" },
    { content: "用户喜欢蓝色" },
    { content: "用户喜欢薄荷" },
    { content: "用户喜欢旧书店" }
  ]);
  assert.equal(E.parseMemoryExtraction(raw).length, 5);
  assert.equal(JSON.stringify(E.parseMemoryExtraction("null")), "[]");
});

test("规范化记忆会补齐来源与时间字段", () => {
  const memory = E.normalizeMemory({
    characterId: "char_test",
    content: "用户喜欢雨天",
    source: "auto"
  });
  assert.equal(memory.source, "auto");
  assert.equal(memory.pinned, false);
  assert.equal(memory.sourceChatId, "");
  assert.equal(JSON.stringify(memory.sourceMessageIds), "[]");
  assert.ok(memory.createdAt > 0);
});

test("规范化记忆会补齐层级、标签和使用状态", () => {
  const memory = E.normalizeMemory({
    characterId: "char_test",
    content: "用户喜欢雨天，喜欢靠窗的位置",
    source: "auto"
  });
  assert.equal(memory.layer, "preference");
  assert.ok(memory.tags.includes("地点"));
  assert.equal(memory.lastUsedAt, 0);
  assert.equal(memory.useCount, 0);
});

test("记忆会保留知情范围和来源字段", () => {
  const memory = E.normalizeMemory({
    characterId: "char_a",
    content: "用户答应周末一起去看展",
    source: "auto",
    scope: "group",
    knownBy: ["char_a", "char_b"],
    sourceChatId: "chat_group",
    confidence: 0.72
  });
  assert.equal(memory.scope, "group");
  assert.deepEqual(Array.from(memory.knownBy), ["char_a", "char_b"]);
  assert.equal(memory.sourceChatId, "chat_group");
  assert.equal(memory.confidence, 0.72);
  assert.equal(E.memoryVisibleTo(memory, "char_b"), true);
});

test("群聊共享记忆可见，私聊记忆不会串到别的角色", () => {
  E.state = {
    settings: { memoryRecallGate: true },
    memories: [
      E.normalizeMemory({
        id: "private_a",
        characterId: "char_a",
        content: "用户喜欢雨天",
        scope: "private",
        knownBy: ["char_a"]
      }),
      E.normalizeMemory({
        id: "group_a",
        characterId: "char_a",
        content: "用户答应周末一起去看展",
        scope: "group",
        knownBy: ["char_a", "char_b"]
      }),
      E.normalizeMemory({
        id: "private_b",
        characterId: "char_b",
        content: "用户怕冷",
        scope: "private",
        knownBy: ["char_b"]
      })
    ]
  };
  const visible = E.rankMemories("char_b", "", 10).map((memory) => memory.id).sort();
  assert.deepEqual(visible, ["group_a", "private_b"]);
});

test("记忆合并时知情范围只会扩大", () => {
  const existing = E.normalizeMemory({
    id: "mem_scope",
    characterId: "char_a",
    content: "用户喜欢雨天",
    scope: "group",
    knownBy: ["char_a", "char_b"]
  });
  const merged = E.mergeMemoryCandidate(existing, {
    content: "用户喜欢雨天",
    scope: "private",
    knownBy: ["char_a"]
  }, 1700000000000);
  assert.equal(merged.scope, "group");
  assert.deepEqual(Array.from(merged.knownBy).sort(), ["char_a", "char_b"]);
});

test("记忆层级会按内容推断", () => {
  assert.equal(E.inferMemoryLayer("用户喜欢喝冰美式"), "preference");
  assert.equal(E.inferMemoryLayer("用户答应周末一起去看展"), "relationship");
  assert.equal(E.inferMemoryLayer("用户上周去了一趟海边"), "episode");
  assert.equal(E.inferMemoryLayer("用户住在杭州"), "fact");
});

test("寒暄不会触发记忆召回", () => {
  E.state = { settings: { memoryRecallGate: true }, memories: [] };
  assert.equal(E.shouldRecallMemories("嗯嗯"), false);
  assert.equal(E.shouldRecallMemories("你还记得我上次说的那家店吗"), true);
});

test("低信号消息不会把记忆塞进提示词", () => {
  E.state = {
    settings: { memoryRecallGate: true },
    memories: [
      E.normalizeMemory({
        id: "mem_1",
        characterId: "char_test",
        content: "用户喜欢雨天",
        importance: 3
      })
    ]
  };
  const low = E.selectMemoriesForPrompt("char_test", "哈哈", 8);
  assert.equal(low.memories.length, 0);
  assert.equal(low.reason, "low-signal");
  const high = E.selectMemoriesForPrompt("char_test", "你还记得我喜欢什么天气吗", 8);
  assert.equal(high.memories.length, 1);
  assert.equal(high.memories[0].id, "mem_1");
});

test("重复记忆会合并标签和来源而不是继续追加", () => {
  const existing = E.normalizeMemory({
    id: "mem_1",
    characterId: "char_test",
    content: "用户喜欢雨天",
    importance: 2,
    sourceMessageIds: ["m1"],
    tags: ["天气"]
  });
  const merged = E.mergeMemoryCandidate(existing, {
    content: "用户喜欢雨天",
    importance: 4,
    layer: "preference",
    tags: ["偏好"],
    sourceMessageIds: ["m2"]
  }, 1700000000000);
  assert.equal(merged.importance, 4);
  assert.deepEqual(Array.from(merged.sourceMessageIds).sort(), ["m1", "m2"]);
  assert.ok(merged.tags.includes("天气"));
  assert.ok(merged.tags.includes("偏好"));
  assert.equal(merged.updatedAt, 1700000000000);
});

test("置顶记忆不衰减，旧记忆比新记忆衰减更多", () => {
  const now = 1700000000000;
  const pinned = E.computeMemoryDecay({ pinned: true, createdAt: now - 86400000 * 365 }, now);
  assert.equal(pinned, 1);
  const fresh = E.computeMemoryDecay({ createdAt: now - 86400000, importance: 3 }, now);
  const old = E.computeMemoryDecay({ createdAt: now - 86400000 * 180, importance: 3 }, now);
  assert.ok(fresh > old);
});
