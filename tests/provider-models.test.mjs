import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadEmber(fetchImpl) {
  const context = {
    window: {},
    console,
    setTimeout,
    clearTimeout,
    URL,
    fetch: fetchImpl || (() => {}),
    TextDecoder,
    DOMException,
    AbortController
  };
  context.window.window = context.window;
  vm.createContext(context);
  for (const file of ["src/js/01-core.js", "src/js/02-state.js", "src/js/03-providers.js"]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  }
  return context.window.Ember;
}

const E = loadEmber();

test("OpenAI 兼容接口会从 /v1 下获取模型列表", () => {
  assert.equal(E.modelsEndpoint("https://api.openai.com/v1", "openai"), "https://api.openai.com/v1/models");
  assert.equal(E.modelsEndpoint("https://openrouter.ai/api/v1/", "openai"), "https://openrouter.ai/api/v1/models");
});

test("Anthropic 会补齐 /v1/models 地址", () => {
  assert.equal(E.modelsEndpoint("https://api.anthropic.com", "anthropic"), "https://api.anthropic.com/v1/models");
  assert.equal(E.modelsEndpoint("https://api.anthropic.com/v1", "anthropic"), "https://api.anthropic.com/v1/models");
  assert.equal(E.modelsEndpoint("https://api.anthropic.com/v1/messages", "anthropic"), "https://api.anthropic.com/v1/models");
});

test("Gemini 会补齐 /v1beta/models 地址", () => {
  assert.equal(E.modelsEndpoint("https://generativelanguage.googleapis.com", "gemini"), "https://generativelanguage.googleapis.com/v1beta/models");
  assert.equal(E.modelsEndpoint("https://generativelanguage.googleapis.com/v1beta", "gemini"), "https://generativelanguage.googleapis.com/v1beta/models");
});

test("OpenAI 模型列表会去重并排序", () => {
  const models = E.normalizeModelList({
    object: "list",
    data: [{ id: "mock-reasoner" }, { id: "mock-chat" }, { id: "mock-chat" }]
  }, "openai");
  assert.deepEqual(Array.from(models), ["mock-chat", "mock-reasoner"]);
});

test("Gemini 模型列表会去掉 models 前缀并过滤非对话模型", () => {
  const models = E.normalizeModelList({
    models: [
      { name: "models/mock-gemini", supportedGenerationMethods: ["generateContent"] },
      { name: "models/mock-embedding", supportedGenerationMethods: ["embedContent"] }
    ]
  }, "gemini");
  assert.deepEqual(Array.from(models), ["mock-gemini"]);
});

test("嵌套模型列表也能解析", () => {
  const models = E.normalizeModelList({
    data: {
      models: [{ id: "model-b" }, { id: "model-a" }]
    }
  }, "openai");
  assert.deepEqual(Array.from(models), ["model-a", "model-b"]);
});

test("获取 OpenAI 兼容模型时会带 Bearer Key", async () => {
  let request = null;
  const app = loadEmber((url, options) => {
    request = { url, options };
    return Promise.resolve({
      ok: true,
      json: async () => ({ data: [{ id: "model-b" }, { id: "model-a" }] })
    });
  });
  app.state = {
    settings: {
      provider: "custom",
      providerConfigs: {
        custom: { baseUrl: "https://example.com/v1", apiKey: "secret", model: "" }
      }
    }
  };
  const models = await app.fetchProviderModels("custom");
  assert.deepEqual(Array.from(models), ["model-a", "model-b"]);
  assert.equal(request.url, "https://example.com/v1/models");
  assert.equal(request.options.headers.Authorization, "Bearer secret");
});

test("获取 Anthropic 和 Gemini 模型时会使用各自协议", async () => {
  const requests = [];
  const app = loadEmber((url, options) => {
    requests.push({ url, options });
    if (url.includes("anthropic")) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [{ id: "claude-test" }] }) });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({
        models: [
          { name: "models/gemini-test", supportedGenerationMethods: ["generateContent"] }
        ]
      })
    });
  });
  app.state = {
    settings: {
      provider: "anthropic",
      providerConfigs: {
        anthropic: { baseUrl: "https://api.anthropic.com", apiKey: "anthropic-key", model: "" },
        gemini: { baseUrl: "https://generativelanguage.googleapis.com", apiKey: "gemini-key", model: "" }
      }
    }
  };
  assert.deepEqual(Array.from(await app.fetchProviderModels("anthropic")), ["claude-test"]);
  assert.equal(requests[0].url, "https://api.anthropic.com/v1/models?limit=1000");
  assert.equal(requests[0].options.headers["x-api-key"], "anthropic-key");

  assert.deepEqual(Array.from(await app.fetchProviderModels("gemini")), ["gemini-test"]);
  assert.equal(requests[1].url, "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=gemini-key");
});
