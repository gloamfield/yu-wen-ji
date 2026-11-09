import { createServer } from "node:http";

const port = Number(process.env.PORT || 8787);

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sse(res, payload) {
  res.write(`data: ${typeof payload === "string" ? payload : JSON.stringify(payload)}\n\n`);
}

function memoryFixture(transcript) {
  const facts = [];
  if (/睡不好|睡得不好|失眠|睡眠不好/.test(transcript)) {
    facts.push({ content: "用户最近睡眠差", importance: 4 });
  }
  if (/靠窗/.test(transcript)) {
    facts.push({ content: "用户喜欢靠窗的位置", importance: 3 });
  }
  if (/雨天/.test(transcript)) {
    facts.push({ content: "用户喜欢雨天", importance: 3 });
  }
  if (/晨跑|跑步/.test(transcript)) {
    facts.push({ content: "用户最近开始晨跑", importance: 3 });
  }
  if (/蓝色/.test(transcript)) {
    facts.push({ content: "用户喜欢蓝色", importance: 3 });
  }
  return JSON.stringify(facts);
}

const server = createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }

  try {
    const body = await readBody(req);

    if (url.pathname.endsWith("/chat/completions")) {
      const messages = body.messages || [];
      const user = [...messages].reverse().find((item) => item.role === "user");
      const system = messages.filter((item) => item.role === "system").map((item) => item.content).join("\n");
      const isMemoryTask = system.includes("长期记忆整理器");
      const text = isMemoryTask
        ? memoryFixture(user ? user.content : "")
        : `OpenAI mock 收到：${user ? user.content : "空消息"}`;
      if (body.stream === false) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ choices: [{ message: { content: text } }] }));
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      for (const piece of ["OpenAI ", "mock ", "收到：", user ? user.content : "空消息"]) {
        sse(res, { choices: [{ delta: { content: piece } }] });
      }
      sse(res, "[DONE]");
      res.end();
      return;
    }

    if (url.pathname.endsWith("/v1/messages")) {
      const last = [...(body.messages || [])].reverse().find((item) => item.role === "user");
      const isMemoryTask = String(body.system || "").includes("长期记忆整理器");
      const text = isMemoryTask
        ? memoryFixture(last ? last.content : "")
        : `Claude mock 收到：${last ? last.content : "空消息"}`;
      if (body.stream === false) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ content: [{ type: "text", text }] }));
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      for (const piece of ["Claude ", "mock ", "收到：", last ? last.content : "空消息"]) {
        res.write("event: content_block_delta\n");
        sse(res, { type: "content_block_delta", delta: { text: piece } });
      }
      res.end();
      return;
    }

    if (url.pathname.includes(":generateContent")) {
      const last = [...(body.contents || [])].reverse().find((item) => item.role === "user");
      const textPart = last && last.parts && last.parts[0] ? last.parts[0].text : "空消息";
      const systemText = body.systemInstruction && body.systemInstruction.parts
        ? body.systemInstruction.parts.map((part) => part.text || "").join("\n")
        : "";
      const text = systemText.includes("长期记忆整理器")
        ? memoryFixture(textPart)
        : `Gemini mock 收到：${textPart}`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unknown endpoint", path: url.pathname }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`mock provider listening on http://127.0.0.1:${port}`);
});
