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

test("短回复会按换行拆成多条消息", () => {
  assert.deepEqual(Array.from(E.splitChatReply("第一句。\n第二句。")), ["第一句。", "第二句。"]);
});

test("空行分段会保留段落边界", () => {
  assert.deepEqual(Array.from(E.splitChatReply("第一段。\n\n第二段。")), ["第一段。", "第二段。"]);
});

test("超过上限时把余下内容合并到最后一条", () => {
  const rows = Array.from(E.splitChatReply("一。\n二。\n三。\n四。\n五。\n六。", { maxSegments: 4 }));
  assert.equal(rows.length, 4);
  assert.equal(rows[3], "四。\n五。\n六。");
});

test("代码块不会被拆开", () => {
  const text = "看这个：\n```js\nconsole.log(1);\n```";
  assert.deepEqual(Array.from(E.splitChatReply(text)), [text]);
});

test("没有标点的长文本也会被切成可控长度", () => {
  const text = "啊".repeat(240);
  const rows = Array.from(E.splitChatReply(text, { maxSegments: 4 }));
  assert.ok(rows.length >= 2);
  assert.ok(rows.every((row) => Array.from(row).length <= 96));
  assert.equal(rows.join(""), text);
});

test("分段延迟落在合理区间，长段落比短段落更久", () => {
  const short = E.chatSegmentDelay("嗯。", 0);
  const long = E.chatSegmentDelay("这是一段比较长的回复，用来确认延迟会随着文字长度增加。", 0);
  assert.ok(short >= 650 && short <= 3000);
  assert.ok(long >= 650 && long <= 3000);
  assert.ok(long > short);
  assert.ok(E.chatSegmentDelay("好。", 6) <= 3000);
});
