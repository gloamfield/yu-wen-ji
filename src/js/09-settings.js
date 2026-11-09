(function () {
  "use strict";

  const E = window.Ember;

  E.renderSettingsHTML = function () {
    const providerId = E.activeProvider();
    const provider = E.PROVIDERS[providerId] || E.PROVIDERS.demo;
    const config = E.getProviderConfig(providerId);
    const currentPack = E.currentThemePack();
    const themeCards = Object.values(E.THEME_PACKS).map((pack) => {
      const active = pack.id === currentPack.id;
      const dots = [pack.accent, pack.accent2, pack.tokens.phoneBg]
        .map((color) => `<span class="theme-pack-dot" style="background:${E.escapeHTML(color)}"></span>`)
        .join("");
      return `
        <button class="theme-pack ${active ? "active" : ""}" type="button" data-action="theme-pack" data-id="${E.escapeHTML(pack.id)}" aria-pressed="${active}">
          <span class="theme-pack-art" style="${E.themePreviewStyle(pack)}">
            <span class="theme-pack-check">${E.icon("check", 12)}</span>
          </span>
          <span class="theme-pack-info">
            <span class="theme-pack-name">${E.escapeHTML(pack.name)}</span>
            <span class="theme-pack-tag">${E.escapeHTML(pack.tagline)}</span>
            <span class="theme-pack-dots">${dots}</span>
          </span>
        </button>
      `;
    }).join("");
    const providerOptions = Object.entries(E.PROVIDERS)
      .map(([id, item]) => `<option value="${E.escapeHTML(id)}" ${id === providerId ? "selected" : ""}>${E.escapeHTML(item.label)}</option>`)
      .join("");
    const lifePace = E.state.settings.lifePace || "normal";
    const lifePaceOptions = Object.entries(E.LIFE_PACES)
      .map(([id, item]) => `<option value="${E.escapeHTML(id)}" ${id === lifePace ? "selected" : ""}>${E.escapeHTML(item.label)} · ${E.escapeHTML(item.description)}</option>`)
      .join("");
    const note = providerId === "demo"
      ? "演示模式不需要 API。它会用本地模板生成回复，适合先体验界面。"
      : providerId === "sillytavern"
        ? "SillyTavern 或本地兼容服务需要允许浏览器跨域访问。通常填写 http://localhost:8000/v1，模型名可以留空或按后端要求填写。"
        : providerId === "anthropic"
          ? "Claude 浏览器直连需要接口允许 anthropic-dangerous-direct-browser-access。接口地址可以填 https://api.anthropic.com 或 https://api.anthropic.com/v1。若被拦截，建议通过自建转发。"
          : providerId === "gemini"
            ? "Gemini 的 Key 会拼在请求地址里。接口地址填 https://generativelanguage.googleapis.com 即可，路径会自动补全。请确认接口允许浏览器跨域访问。"
            : "API Key 只保存在这台设备的本地存储里，不会上传到我们的服务器。导出备份默认不包含 Key。";
    return `
      <div class="app-page">
        ${E.appHeaderHTML("设置", { subtitle: "本地优先 · 用户自备 API" })}
        <div class="app-body">
          <div class="section-label">主题皮肤</div>
          <div class="theme-current-note">正在使用 <b>${E.escapeHTML(currentPack.name)}</b> · ${E.escapeHTML(currentPack.description)}</div>
          <div class="theme-pack-grid">${themeCards}</div>

          <div class="section-label">个人</div>
          <div class="card settings-group" style="padding:12px 14px">
            <div class="field">
              <label>你的名字</label>
              <input id="settings-user-name" value="${E.escapeHTML(E.state.settings.userName || "我")}" placeholder="我">
            </div>
            <label style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--muted)">
              <input id="settings-autospeak" type="checkbox" ${E.state.settings.autoSpeak ? "checked" : ""} style="width:auto">
              角色回复后自动朗读
            </label>
            <label style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--muted);margin-top:10px">
              <input id="settings-auto-memory" type="checkbox" ${E.state.settings.autoMemory ? "checked" : ""} style="width:auto">
              自动记忆
            </label>
            <div class="hint" style="margin:4px 0 0 24px">检测到值得记住的内容时自动整理；真实模型会额外调用一次接口。</div>
          </div>

          <div class="section-label">聊天体验</div>
          <div class="card settings-group" style="padding:12px 14px">
            <label style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--text)">
              <input id="settings-segment-replies" type="checkbox" ${E.state.settings.segmentReplies !== false ? "checked" : ""} style="width:auto">
              长回复自动分段
            </label>
            <div class="hint" style="margin:4px 0 0 24px">按段落和句子拆成多条消息，最多 4 条；代码块保持完整。</div>
            <label style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--text);margin-top:10px">
              <input id="settings-typing-delay" type="checkbox" ${E.state.settings.typingDelay !== false ? "checked" : ""} style="width:auto">
              分段之间显示“正在输入”
            </label>
            <div class="hint" style="margin:4px 0 0 24px">按每段长度等待一小会儿再出现，模拟对方打字；关闭后消息会连续出现。</div>
          </div>

          <div class="section-label">生活</div>
          <div class="card settings-group" style="padding:12px 14px">
            <label style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--text)">
              <input id="settings-life-engine" type="checkbox" ${E.state.settings.lifeEngine ? "checked" : ""} style="width:auto">
              让角色在你离开时继续生活
            </label>
            <div class="hint" style="margin:4px 0 0 24px">重新打开手机时结算：角色可能发动态、写日记、发消息或留下未接来电。事件会按天限量，不会无限堆积。</div>
            <div class="field" style="margin-top:12px">
              <label>生活节奏</label>
              <select id="settings-life-pace">${lifePaceOptions}</select>
            </div>
            <label style="display:flex;align-items:center;gap:9px;font-size:12px;color:var(--text);margin-top:14px">
              <input id="settings-dnd-enabled" type="checkbox" ${E.state.settings.dndEnabled ? "checked" : ""} style="width:auto">
              勿扰时段
            </label>
            <div class="hint" style="margin:4px 0 0 24px">这段时间里角色照常写日记、发动态，但不发消息、不打电话、不弹通知。</div>
            <div class="row" style="gap:8px;margin-top:10px">
              <div class="field grow">
                <label>开始</label>
                <input id="settings-dnd-start" type="time" value="${E.escapeHTML(E.state.settings.dndStart || "23:00")}">
              </div>
              <div class="field grow">
                <label>结束</label>
                <input id="settings-dnd-end" type="time" value="${E.escapeHTML(E.state.settings.dndEnd || "08:00")}">
              </div>
            </div>
            <button class="btn ghost" data-action="life-tick-now" style="width:100%">${E.icon("sparkles", 16)} 模拟一次三小时的离开</button>
          </div>

          <div class="section-label">模型接口</div>
          <div class="provider-note">${E.escapeHTML(note)}</div>
          <div class="card settings-group" style="padding:12px 14px">
            <div class="field">
              <label>服务商</label>
              <select id="settings-provider" data-action="provider-change">
                ${providerOptions}
              </select>
            </div>
            <div class="field">
              <label>接口地址</label>
              <input id="settings-base-url" value="${E.escapeHTML(config.baseUrl || "")}" placeholder="https://api.example.com/v1">
              <div class="hint">OpenAI 兼容接口通常以 /v1 结尾。</div>
            </div>
            <div class="field">
              <label>API Key</label>
              <input id="settings-api-key" type="password" value="${E.escapeHTML(config.apiKey || "")}" placeholder="sk-...">
              <div class="hint">只保存在本机。不要把 Key 发给别人。</div>
            </div>
            <div class="field">
              <label>模型名</label>
              <input id="settings-model" value="${E.escapeHTML(config.model || "")}" placeholder="${E.escapeHTML(provider.defaultModel || "模型名")}">
            </div>
            <div class="row" style="gap:8px">
              <button class="btn ghost" data-action="test-provider" style="flex:1">${E.icon("shield", 16)} 测试连接</button>
              <button class="btn" data-action="save-settings" style="flex:1">${E.icon("check", 16)} 保存设置</button>
            </div>
          </div>

          <div class="section-label">数据</div>
          <div class="card settings-group">
            <div class="settings-row" data-action="export-backup">
              <div class="settings-icon">${E.icon("download", 17)}</div>
              <div class="grow"><div class="settings-label">导出完整备份</div><div class="settings-desc">角色、聊天、动态、相册、日记等</div></div>
              <span class="muted">${E.icon("arrowRight", 16)}</span>
            </div>
            <div class="settings-row" data-action="import-backup">
              <div class="settings-icon">${E.icon("upload", 17)}</div>
              <div class="grow"><div class="settings-label">导入完整备份</div><div class="settings-desc">覆盖当前数据，导入前会确认</div></div>
              <span class="muted">${E.icon("arrowRight", 16)}</span>
            </div>
            <div class="settings-row" data-action="export-characters">
              <div class="settings-icon">${E.icon("contacts", 17)}</div>
              <div class="grow"><div class="settings-label">导出全部角色</div><div class="settings-desc">JSON 数组，便于迁移</div></div>
              <span class="muted">${E.icon("arrowRight", 16)}</span>
            </div>
            <div class="settings-row" data-action="clear-data">
              <div class="settings-icon" style="background:rgba(201,79,85,.12);color:var(--danger)">${E.icon("trash", 17)}</div>
              <div class="grow"><div class="settings-label text-danger">清空全部数据</div><div class="settings-desc">包括角色、聊天、设置和 API Key</div></div>
              <span class="muted">${E.icon("arrowRight", 16)}</span>
            </div>
          </div>

          <div class="section-label">关于</div>
          <div class="card settings-group">
            <div class="settings-row" data-action="about">
              <div class="settings-icon">${E.icon("info", 17)}</div>
              <div class="grow"><div class="settings-label">余温机</div><div class="settings-desc">v${E.VERSION} · MIT License · 免费开源</div></div>
              <span class="muted">${E.icon("arrowRight", 16)}</span>
            </div>
            <div class="settings-row" data-action="lock-screen">
              <div class="settings-icon">${E.icon("lock", 17)}</div>
              <div class="grow"><div class="settings-label">锁屏</div><div class="settings-desc">回到锁屏界面</div></div>
              <span class="muted">${E.icon("arrowRight", 16)}</span>
            </div>
          </div>
          <div class="hint" style="text-align:center;margin:18px 10px 0">
            所有数据默认保存在你的浏览器里。没有账号，没有云端，没有作者服务器。
          </div>
          ${location.protocol === "file:" ? `<div class="hint" style="text-align:center;margin:8px 10px 0">
            当前是双击打开的单文件模式，使用 localStorage 保存数据，容量有限。照片和音乐较多时，建议用本地静态服务器打开以启用 IndexedDB。
          </div>` : ""}
        </div>
      </div>
    `;
  };

  E.collectSettingsFields = function () {
    const providerId = E.activeProvider();
    const providerConfigs = E.state.settings.providerConfigs || {};
    const config = Object.assign({}, E.DEFAULT_PROVIDER_CONFIGS[providerId] || {}, providerConfigs[providerId] || {});
    const base = document.getElementById("settings-base-url");
    const key = document.getElementById("settings-api-key");
    const model = document.getElementById("settings-model");
    if (base) config.baseUrl = base.value.trim();
    if (key) config.apiKey = key.value.trim();
    if (model) config.model = model.value.trim();
    providerConfigs[providerId] = config;
    E.state.settings.providerConfigs = providerConfigs;
    const userName = document.getElementById("settings-user-name");
    const autoSpeak = document.getElementById("settings-autospeak");
    const autoMemory = document.getElementById("settings-auto-memory");
    const segmentReplies = document.getElementById("settings-segment-replies");
    const typingDelay = document.getElementById("settings-typing-delay");
    const lifeEngine = document.getElementById("settings-life-engine");
    const lifePace = document.getElementById("settings-life-pace");
    const dndEnabled = document.getElementById("settings-dnd-enabled");
    const dndStart = document.getElementById("settings-dnd-start");
    const dndEnd = document.getElementById("settings-dnd-end");
    if (userName) E.state.settings.userName = userName.value.trim() || "我";
    if (autoSpeak) E.state.settings.autoSpeak = !!autoSpeak.checked;
    if (autoMemory) E.state.settings.autoMemory = !!autoMemory.checked;
    if (segmentReplies) E.state.settings.segmentReplies = !!segmentReplies.checked;
    if (typingDelay) E.state.settings.typingDelay = !!typingDelay.checked;
    if (lifeEngine) E.state.settings.lifeEngine = !!lifeEngine.checked;
    if (lifePace && E.LIFE_PACES[lifePace.value]) E.state.settings.lifePace = lifePace.value;
    if (dndEnabled) E.state.settings.dndEnabled = !!dndEnabled.checked;
    if (dndStart && dndStart.value) E.state.settings.dndStart = dndStart.value;
    if (dndEnd && dndEnd.value) E.state.settings.dndEnd = dndEnd.value;
    return E.state.settings;
  };

  E.saveSettingsFromFields = async function (silent) {
    E.collectSettingsFields();
    await E.saveSettings();
    E.applyTheme();
    E.renderStatus();
    if (!silent) E.toast("设置已保存");
  };

  E.setThemePack = async function (id) {
    const pack = E.THEME_PACKS[id];
    if (!pack) return;
    E.state.settings.themePack = id;
    E.applyTheme();
    await E.saveSettings();
    if (E.parseRoute().name === "settings") E.renderRoute();
    E.toast(`已切换到「${pack.name}」`);
  };

  E.changeProvider = async function (providerId) {
    await E.saveSettingsFromFields(true);
    E.state.settings.provider = providerId;
    await E.saveSettings();
    E.renderRoute();
  };

  E.testProviderFromFields = async function () {
    await E.saveSettingsFromFields(true);
    E.toast("正在测试连接……", 1600);
    try {
      const result = await E.testProvider();
      E.toast(`连接成功：${String(result).slice(0, 80)}`, 3200);
    } catch (error) {
      E.toast(E.humanError(error), 5200);
    }
  };

  E.exportBackup = async function () {
    const data = {};
    const stores = ["characters", "chats", "messages", "moments", "calls", "gallery", "diary", "anniversaries", "wallet", "music", "forum", "memories"];
    for (const store of stores) {
      data[store] = await E.db.getAll(store);
    }
    const safeSettings = JSON.parse(JSON.stringify(E.state.settings));
    if (safeSettings.providerConfigs) {
      for (const key of Object.keys(safeSettings.providerConfigs)) {
        safeSettings.providerConfigs[key].apiKey = "";
      }
    }
    const backup = {
      format: "ember-phone-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      app: E.APP_NAME,
      data,
      settings: safeSettings,
      notifications: E.state.notifications,
      lifeState: E.state.life
    };
    E.download(`余温机备份-${E.fmtDateShort()}.json`, JSON.stringify(backup, null, 2));
    E.toast("备份已导出");
  };

  E.importBackupFlow = function () {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const raw = await E.readFileAsText(file);
        const backup = JSON.parse(raw);
        if (!backup || backup.format !== "ember-phone-backup" || !backup.data) {
          throw new Error("这不是余温机备份文件");
        }
        if (!E.confirm("导入会覆盖当前全部数据，继续吗？")) return;
        const currentProviderConfigs = E.state.settings.providerConfigs;
        await E.db.clearAll();
        const stores = ["characters", "chats", "messages", "moments", "calls", "gallery", "diary", "anniversaries", "wallet", "music", "forum", "memories"];
        for (const store of stores) {
          const rows = backup.data[store];
          if (Array.isArray(rows) && rows.length) await E.db.bulkPut(store, rows);
        }
        const importedSettings = E.deepMergeSettings(backup.settings || {});
        importedSettings.providerConfigs = currentProviderConfigs;
        await E.db.setMeta("settings", importedSettings);
        await E.db.setMeta("notifications", Array.isArray(backup.notifications) ? backup.notifications : []);
        await E.db.setMeta("lifeState", backup.lifeState || null);
        await E.db.setMeta("seeded", true);
        await E.loadState();
        E.state.settings = importedSettings;
        E.applyTheme();
        E.toast("备份已导入");
        E.navigate("#/home");
        E.renderRoute();
      } catch (error) {
        E.toast(error.message || "导入失败", 4200);
      }
    });
    input.click();
  };

  E.exportAllCharacters = function () {
    E.download("余温机角色列表.json", JSON.stringify(E.state.characters, null, 2));
    E.toast("角色列表已导出");
  };

  E.clearAllDataFlow = async function () {
    if (!E.confirm("清空全部数据？包括角色、聊天、设置和 API Key。此操作不可撤销。")) return;
    await E.db.clearAll();
    await E.db.setMeta("seeded", true);
    E.state.settings = E.deepMergeSettings(null);
    E.state.notifications = [];
    E.state.characters = [];
    E.state.chats = [];
    E.state.messages = [];
    E.state.moments = [];
    E.state.calls = [];
    E.state.gallery = [];
    E.state.diary = [];
    E.state.anniversaries = [];
    E.state.wallet = [];
    E.state.music = [];
    E.state.forum = [];
    E.state.memories = [];
    E.state.life = E.normalizeLifeState(null);
    await E.saveSettings();
    await E.saveLifeState();
    E.applyTheme();
    E.toast("数据已清空");
    E.lock();
  };

  E.showAbout = function () {
    E.openSheet({
      title: "关于余温机",
      body: `
        <div style="padding:4px 2px 12px">
          <div style="font-size:22px;font-weight:750;letter-spacing:-.03em">余温机</div>
          <div class="hint" style="margin-top:6px">一部会自己继续生活的 AI 小手机。</div>
          <div class="entry-row" style="margin-top:16px">
            <div class="entry-title">免费开源</div>
            <div class="entry-text">MIT License。你可以使用、修改、分发，但请保留原作者署名。</div>
          </div>
          <div class="entry-row">
            <div class="entry-title">本地优先</div>
            <div class="entry-text">角色、聊天、动态和设置默认存在浏览器 IndexedDB / localStorage 中。没有作者服务器，没有账号系统。</div>
          </div>
          <div class="entry-row">
            <div class="entry-title">API 自备</div>
            <div class="entry-text">模型、语音等服务由用户自己选择并承担费用。API Key 只保存在本机，导出备份默认不包含 Key。</div>
          </div>
          <div class="entry-row">
            <div class="entry-title">数据迁移</div>
            <div class="entry-text">支持完整备份、角色卡导入导出、聊天记录导入导出。建议定期导出备份。</div>
          </div>
          <div class="entry-row">
            <div class="entry-title">生活事件</div>
            <div class="entry-text">角色会在你离开后继续生活。重新打开手机时，按离开时长结算动态、日记、消息和未接来电；事件有每日上限。</div>
          </div>
          <div class="hint" style="margin-top:14px">v${E.VERSION} · 2026</div>
        </div>
      `
    });
  };
})();
