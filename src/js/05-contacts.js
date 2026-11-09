(function () {
  "use strict";

  const E = window.Ember;

  function proactiveModeOptions() {
    return [
      { value: "inherit", label: "跟随全局" },
      { value: "off", label: "关闭" },
      { value: "quiet", label: "安静" },
      { value: "normal", label: "正常" },
      { value: "lively", label: "热闹" }
    ];
  }

  function parseWorldbookKeywords(value) {
    return Array.from(new Set(
      String(value || "")
        .split(/[,，、;；\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )).slice(0, 12);
  }

  function memoryScopeLabel(scope) {
    if (scope === "group") return "群聊共享";
    if (scope === "public") return "所有角色可见";
    return "仅本人知情";
  }

  function memoryKnownNames(memory) {
    const ids = Array.isArray(memory && memory.knownBy) ? memory.knownBy : [];
    return ids
      .map((id) => E.getCharacter(id))
      .filter(Boolean)
      .map((character) => character.name);
  }

  E.renderContactsHTML = function () {
    const characters = E.state.characters.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "zh"));
    return `
      <div class="app-page">
        ${E.appHeaderHTML("角色", {
          back: false,
          actions: `
            <button class="header-btn" data-action="import-character" aria-label="导入角色卡">${E.icon("upload", 19)}</button>
            <button class="header-btn" data-action="add-character" aria-label="新增角色">${E.icon("plus", 20)}</button>
          `
        })}
        <div class="app-body">
          ${E.relationshipGraphHTML()}
          <div class="section-label">全部角色 · ${characters.length}</div>
          ${characters.length ? `<div class="character-list">
            ${characters.map((character) => `
              <div class="character-row" data-route="#/character/${E.escapeHTML(character.id)}">
                ${E.avatar(character, "")}
                <div class="grow">
                  <div class="row-between">
                    <div class="character-name">${E.escapeHTML(character.name)}</div>
                    <span class="pill">${E.escapeHTML(character.relationship || "朋友")}</span>
                  </div>
                  <div class="character-desc">${E.escapeHTML(character.persona || "还没有写人设")}</div>
                </div>
              </div>
            `).join("")}
          </div>` : E.emptyState("contacts", "还没有角色", "新增一个角色，或者导入 SillyTavern 的 JSON / PNG 角色卡。", `<button class="btn" data-action="add-character">${E.icon("plus", 16)} 新增角色</button>`)}
          <div class="section-label">关系与记忆</div>
          <div class="card">
            <div class="settings-row" data-route="#/memory">
              <div class="settings-icon">${E.icon("memory", 17)}</div>
              <div class="grow"><div class="settings-label">记忆库</div><div class="settings-desc">查看所有角色记住的事</div></div>
              <span class="muted">${E.icon("arrowRight", 16)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  E.relationshipGraphHTML = function () {
    const characters = E.state.characters.slice(0, 8);
    if (!characters.length) {
      return `<div class="card relation-card">${E.emptyState("group", "关系网还是空的", "新增角色以后，这里会出现你和他们的关系。")}</div>`;
    }
    const cx = 170;
    const cy = 108;
    const radius = characters.length === 1 ? 0 : 72;
    const nodes = characters.map((character, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / characters.length;
      return {
        character,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      };
    });
    const edges = nodes.map((node) => {
      const mx = (cx + node.x) / 2;
      const my = (cy + node.y) / 2;
      return `
        <line x1="${cx}" y1="${cy}" x2="${node.x}" y2="${node.y}" stroke="rgba(200,127,138,.28)" stroke-width="1"/>
        <text x="${mx}" y="${my - 4}" fill="#9a8d91" font-size="8.5" text-anchor="middle">${E.escapeHTML(node.character.relationship || "朋友")}</text>
      `;
    }).join("");
    const circles = nodes.map((node) => `
      <g data-route="#/character/${E.escapeHTML(node.character.id)}" style="cursor:pointer">
        <circle cx="${node.x}" cy="${node.y}" r="19" fill="${E.escapeHTML(node.character.color || "#c87f8a")}" opacity=".92"/>
        <text x="${node.x}" y="${node.y + 4}" fill="#fff" font-size="12" font-weight="700" text-anchor="middle">${E.escapeHTML((node.character.name || "?").slice(0, 1))}</text>
        <text x="${node.x}" y="${node.y + 33}" fill="currentColor" font-size="9" text-anchor="middle">${E.escapeHTML(node.character.name)}</text>
      </g>
    `).join("");
    return `
      <div class="card relation-card">
        <svg class="relation-svg" viewBox="0 0 340 210" role="img" aria-label="关系网">
          ${edges}
          <circle cx="${cx}" cy="${cy}" r="24" fill="#241f21" opacity=".92"/>
          <text x="${cx}" y="${cy + 4}" fill="#fff" font-size="11" font-weight="700" text-anchor="middle">${E.escapeHTML((E.state.settings.userName || "我").slice(0, 1))}</text>
          ${circles}
        </svg>
      </div>
    `;
  };

  E.renderCharacterDetailHTML = function (characterId) {
    const character = E.getCharacter(characterId);
    if (!character) return `<div class="app-page">${E.appHeaderHTML("角色")}<div class="app-body">${E.emptyState("contacts", "角色不存在", "这个角色可能已经被删除了。")}</div></div>`;
    const tab = E.state.characterTab || "persona";
    const state = E.characterStateFor(character);
    const memories = E.state.memories
      .filter((item) => typeof E.memoryVisibleTo === "function"
        ? E.memoryVisibleTo(item, character.id)
        : item.characterId === character.id)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.updatedAt || b.createdAt) - Number(a.updatedAt || a.createdAt));
    const worldbook = character.worldbook || [];
    let tabBody = "";
    if (tab === "persona") {
      tabBody = `<div class="card prose">${E.escapeHTML(character.persona || "还没有写人设。")}</div>`;
    } else if (tab === "worldbook") {
      tabBody = `
        <div class="row-between" style="margin:4px 0 10px">
          <div class="muted tiny">${worldbook.length} 条设定</div>
          <button class="btn small soft" data-action="add-worldbook" data-id="${E.escapeHTML(character.id)}">${E.icon("plus", 14)} 添加</button>
        </div>
        ${worldbook.length ? worldbook.map((entry) => `
          <div class="entry-row">
            <div class="entry-title">${E.escapeHTML(entry.title || "设定")}</div>
            <div class="entry-text">${E.escapeHTML(entry.content || "")}</div>
            ${Array.isArray(entry.keywords) && entry.keywords.length ? `<div class="entry-actions"><span class="muted tiny">触发词：${entry.keywords.map(E.escapeHTML).join(" / ")}</span></div>` : ""}
            <div class="entry-actions">
              <button class="icon-btn" data-action="delete-worldbook" data-id="${E.escapeHTML(character.id)}" data-entry="${E.escapeHTML(entry.id)}" aria-label="删除">${E.icon("trash", 15)}</button>
            </div>
          </div>
        `).join("") : E.emptyState("book", "还没有世界书", "写下角色生活的世界、地点、习惯和秘密。")}
      `;
    } else {
      tabBody = `
        <div class="row-between" style="margin:4px 0 10px">
          <div class="muted tiny">${memories.length} 条记忆 · ${memories.filter((item) => item.pinned).length} 条置顶</div>
          <button class="btn small soft" data-action="add-memory" data-id="${E.escapeHTML(character.id)}">${E.icon("plus", 14)} 添加</button>
        </div>
        ${memories.length ? memories.map((memory) => `
          <div class="entry-row ${memory.pinned ? "memory-pinned" : ""}">
            <div class="row-between" style="align-items:center;gap:8px">
              <span class="row" style="gap:4px;flex-wrap:wrap">
                <span class="pill">${E.escapeHTML(E.memoryLayerLabel(memory.layer))}</span>
                <span class="pill">${E.escapeHTML(E.memorySourceLabel(memory))}</span>
                <span class="pill">${E.escapeHTML(E.memoryScopeLabel(memory.scope))}</span>
              </span>
              <div class="row" style="gap:0">
                <button class="icon-btn" data-action="edit-memory" data-id="${E.escapeHTML(memory.id)}" aria-label="编辑">${E.icon("edit", 15)}</button>
                <button class="icon-btn" data-action="toggle-memory-pin" data-id="${E.escapeHTML(memory.id)}" aria-label="${memory.pinned ? "取消置顶" : "置顶"}">${E.icon("pin", 15)}</button>
                <button class="icon-btn" data-action="delete-memory" data-id="${E.escapeHTML(memory.id)}" aria-label="删除">${E.icon("trash", 15)}</button>
              </div>
            </div>
            <div class="entry-text" style="margin-top:0">${E.escapeHTML(memory.content || "")}</div>
            <div class="entry-actions">
              <span class="muted tiny" style="margin-right:auto">来源 ${E.escapeHTML(E.memorySourceDetail(memory))} · 重要度 ${Number(memory.importance || 1)} · ${E.fmtRelative(memory.updatedAt || memory.createdAt)}${memory.pinned ? " · 已置顶" : ""}${Array.isArray(memory.tags) && memory.tags.length ? ` · ${memory.tags.map((tag) => E.escapeHTML(tag)).join(" / ")}` : ""}</span>
            </div>
          </div>
        `).join("") : E.emptyState("memory", "还没有记忆", "聊天里值得留下的事，可以手动记在这里。")}
      `;
    }
    return `
      <div class="app-page">
        ${E.appHeaderHTML(character.name, {
          subtitle: character.relationship,
          actions: `
            <button class="header-btn" data-action="edit-character" data-id="${E.escapeHTML(character.id)}" aria-label="编辑">${E.icon("edit", 18)}</button>
            <button class="header-btn" data-action="character-menu" data-id="${E.escapeHTML(character.id)}" aria-label="更多">${E.icon("more", 18)}</button>
          `
        })}
        <div class="app-body">
          <div class="profile-hero">
            ${E.avatar(character, "lg")}
            <div class="profile-name">${E.escapeHTML(character.name)}</div>
            <div class="profile-sub">${E.escapeHTML(character.relationship || "朋友")}${character.tags && character.tags.length ? ` · ${character.tags.map(E.escapeHTML).join(" / ")}` : ""} · 主动消息 ${E.escapeHTML(E.proactiveModeLabel(character.proactiveMode))}</div>
            <div class="profile-actions">
              <button class="btn" data-action="start-chat" data-id="${E.escapeHTML(character.id)}">${E.icon("chat", 16)} 聊天</button>
              <button class="btn ghost" data-action="export-character" data-id="${E.escapeHTML(character.id)}">${E.icon("download", 16)} 导出</button>
            </div>
          </div>
          ${state ? `
            <div class="character-state-card">
              <span class="character-state-dot ${E.escapeHTML(state.availability)}"></span>
              <div class="grow">
                <div class="character-state-title">${E.escapeHTML(state.statusLine)}</div>
                <div class="character-state-sub">${E.escapeHTML(state.location)} · 精力 ${state.energy}% · ${E.escapeHTML(state.replyStyle)}</div>
              </div>
              <div class="character-state-side">
                <div>${state.nextBlock ? `接下来 ${E.fmtClock(state.nextBlockAt)} ${E.escapeHTML(state.nextBlock.activity)}` : ""}</div>
                <button class="text-btn" data-action="proactive-debug" data-id="${E.escapeHTML(character.id)}">为什么</button>
              </div>
            </div>
          ` : ""}
          <div class="tabs">
            <button class="tab ${tab === "persona" ? "active" : ""}" data-action="character-tab" data-tab="persona">人设</button>
            <button class="tab ${tab === "worldbook" ? "active" : ""}" data-action="character-tab" data-tab="worldbook">世界书</button>
            <button class="tab ${tab === "memory" ? "active" : ""}" data-action="character-tab" data-tab="memory">记忆</button>
          </div>
          ${tabBody}
        </div>
      </div>
    `;
  };

  E.renderMemoryLibraryHTML = function () {
    const rows = E.state.memories
      .slice()
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.updatedAt || b.createdAt) - Number(a.updatedAt || a.createdAt));
    const grouped = new Map();
    rows.forEach((memory) => {
      const character = E.getCharacter(memory.characterId);
      const key = character ? character.id : "unknown";
      if (!grouped.has(key)) grouped.set(key, { character, items: [] });
      grouped.get(key).items.push(memory);
    });
    return `
      <div class="app-page">
        ${E.appHeaderHTML("记忆库", { subtitle: "角色记住的事" })}
        <div class="app-body">
          ${rows.length ? Array.from(grouped.values()).map((group) => `
            <div class="section-label">${E.escapeHTML(group.character ? group.character.name : "未知角色")} · ${group.items.length} 条</div>
            ${group.items.map((memory) => `
              <div class="entry-row ${memory.pinned ? "memory-pinned" : ""}">
                <div class="row-between" style="align-items:center;gap:8px">
                  <span class="row" style="gap:4px;flex-wrap:wrap">
                    <span class="pill">${E.escapeHTML(E.memoryLayerLabel(memory.layer))}</span>
                    <span class="pill">${E.escapeHTML(E.memorySourceLabel(memory))}</span>
                    <span class="pill">${E.escapeHTML(E.memoryScopeLabel(memory.scope))}</span>
                  </span>
                  <div class="row" style="gap:0">
                    <button class="icon-btn" data-action="edit-memory" data-id="${E.escapeHTML(memory.id)}" aria-label="编辑">${E.icon("edit", 15)}</button>
                    <button class="icon-btn" data-action="toggle-memory-pin" data-id="${E.escapeHTML(memory.id)}" aria-label="${memory.pinned ? "取消置顶" : "置顶"}">${E.icon("pin", 15)}</button>
                    <button class="icon-btn" data-action="delete-memory" data-id="${E.escapeHTML(memory.id)}" aria-label="删除">${E.icon("trash", 15)}</button>
                  </div>
                </div>
                <div class="entry-text" style="margin-top:0">${E.escapeHTML(memory.content)}</div>
                <div class="entry-actions">
                  <span class="muted tiny" style="margin-right:auto">来源 ${E.escapeHTML(E.memorySourceDetail(memory))} · 重要度 ${Number(memory.importance || 1)} · ${E.fmtRelative(memory.updatedAt || memory.createdAt)}${memory.pinned ? " · 已置顶" : ""}${Array.isArray(memory.tags) && memory.tags.length ? ` · ${memory.tags.map((tag) => E.escapeHTML(tag)).join(" / ")}` : ""}</span>
                </div>
              </div>
            `).join("")}
          `).join("") : E.emptyState("memory", "记忆库是空的", "角色在聊天中记住的事，会慢慢积累在这里。", `<button class="btn" data-action="add-memory">${E.icon("plus", 16)} 添加记忆</button>`)}
        </div>
      </div>
    `;
  };

  E.memorySourceLabel = function (memory) {
    if (!memory) return "记忆";
    if (memory.source === "auto") return "自动记住";
    if (memory.source === "seed") return "初始记忆";
    return "手动添加";
  };

  E.memoryScopeLabel = memoryScopeLabel;

  E.memorySourceDetail = function (memory) {
    if (!memory) return "记忆";
    const names = memoryKnownNames(memory);
    const scope = memory.scope === "group"
      ? `群聊共享${names.length ? `（${names.join("、")}）` : ""}`
      : memory.scope === "public"
        ? "所有角色可见"
        : names.length ? `仅${names.join("、")}知情` : "仅本人知情";
    const parts = [E.memorySourceLabel(memory), scope];
    const chat = memory.sourceChatId ? E.getChat(memory.sourceChatId) : null;
    if (chat) parts.push(`来自「${E.chatTitle(chat)}」`);
    if (Number(memory.confidence) && Number(memory.confidence) < 0.9) {
      parts.push(`可信度 ${Math.round(Number(memory.confidence) * 100)}%`);
    }
    return parts.join(" · ");
  };

  E.addCharacterFlow = function () {
    E.formSheet({
      title: "新增角色",
      fields: [
        { name: "name", label: "名字", required: true, placeholder: "她叫什么？" },
        { name: "relationship", label: "关系", value: "朋友", placeholder: "朋友 / 暧昧 / 旧友" },
        { name: "persona", label: "人设", type: "textarea", placeholder: "年龄、性格、习惯、说话方式……" },
        { name: "greeting", label: "第一句话", type: "textarea", placeholder: "打开聊天时，她说的第一句话。" },
        { name: "color", label: "主题色", type: "color", value: "#c87f8a" },
        { name: "proactiveMode", label: "主动消息", type: "select", value: "inherit", options: proactiveModeOptions(), hint: "跟随全局会使用设置里的主动节奏；关闭后这个角色不会主动发消息。" }
      ],
      submitLabel: "创建角色",
      onSubmit: async (values) => {
        const character = E.normalizeCharacter({
          name: values.name.trim(),
          relationship: values.relationship.trim() || "朋友",
          persona: values.persona.trim(),
          greeting: values.greeting.trim(),
          color: values.color,
          proactiveMode: values.proactiveMode,
          worldbook: []
        });
        E.state.characters.push(character);
        await E.db.put("characters", character);
        E.toast("角色已创建");
        E.navigate(`#/character/${character.id}`);
      }
    });
  };

  E.editCharacterFlow = function (id) {
    const character = E.getCharacter(id);
    if (!character) return;
    E.formSheet({
      title: "编辑角色",
      fields: [
        { name: "name", label: "名字", value: character.name, required: true },
        { name: "relationship", label: "关系", value: character.relationship || "朋友" },
        { name: "persona", label: "人设", type: "textarea", value: character.persona || "" },
        { name: "greeting", label: "第一句话", type: "textarea", value: character.greeting || "" },
        { name: "color", label: "主题色", type: "color", value: character.color || "#c87f8a" },
        { name: "proactiveMode", label: "主动消息", type: "select", value: character.proactiveMode || "inherit", options: proactiveModeOptions(), hint: "这个设置只影响主动消息，不会影响你主动找她时的回复。" }
      ],
      submitLabel: "保存",
      onSubmit: async (values) => {
        character.name = values.name.trim() || character.name;
        character.relationship = values.relationship.trim() || "朋友";
        character.persona = values.persona.trim();
        character.greeting = values.greeting.trim();
        character.color = values.color || character.color;
        character.proactiveMode = values.proactiveMode || "inherit";
        await E.db.put("characters", character);
        E.toast("已保存");
        E.renderRoute();
      }
    });
  };

  E.importCharacterFlow = function () {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.png,application/json,image/png";
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const character = await E.readCharacterFile(file);
        character.relationship = character.relationship || "导入角色";
        E.state.characters.push(character);
        await E.db.put("characters", character);
        E.toast(`已导入「${character.name}」`);
        E.navigate(`#/character/${character.id}`);
      } catch (error) {
        E.toast(error.message || "导入失败");
      }
    });
    input.click();
  };

  E.characterMenuFlow = function (id) {
    const character = E.getCharacter(id);
    if (!character) return;
    E.openSheet({
      title: character.name,
      body: `
        <div class="settings-group card">
          <div class="settings-row" data-action="export-character" data-id="${E.escapeHTML(character.id)}">
            <div class="settings-icon">${E.icon("download", 17)}</div>
            <div class="grow"><div class="settings-label">导出角色卡</div><div class="settings-desc">导出为 SillyTavern V2 JSON</div></div>
          </div>
          <div class="settings-row" data-action="delete-character" data-id="${E.escapeHTML(character.id)}">
            <div class="settings-icon" style="background:rgba(201,79,85,.12);color:var(--danger)">${E.icon("trash", 17)}</div>
            <div class="grow"><div class="settings-label text-danger">删除角色</div><div class="settings-desc">同时删除相关聊天和记忆</div></div>
          </div>
        </div>
      `
    });
  };

  E.proactiveDebugFlow = function (characterId) {
    const rows = E.proactiveEngine.debugSnapshot(characterId);
    if (!rows.length) {
      E.toast("还没有可调试的角色");
      return;
    }
    const body = `
      <div class="proactive-debug-intro">
        主动消息会先排队，再经过勿扰、当前状态、最近聊天、冷却和每日上限几道门。这里显示的是角色此刻为什么发、或者为什么还没发。
      </div>
      ${rows.map((row) => {
        const state = row.state;
        const pending = row.pending;
        const evaluation = row.evaluation;
        const suppressed = evaluation && evaluation.suppressedBy
          ? E.proactiveEngine.suppressLabel(evaluation.suppressedBy)
          : "没有待评估意图";
        const nextAt = row.nextEligibleAt ? E.fmtDateTime(row.nextEligibleAt) : "没有限制";
        return `
          <div class="proactive-debug-card">
            <div class="row-between" style="align-items:flex-start;gap:10px">
              <div>
                <div class="proactive-debug-name">${E.escapeHTML(row.character.name)}</div>
                <div class="muted tiny">${E.escapeHTML(row.modeLabel)} · ${row.enabled ? "已启用" : "已关闭"}${row.pace ? ` · 每天最多 ${row.dailyCap} 次` : ""}</div>
              </div>
              <span class="character-state-dot ${E.escapeHTML(state ? state.availability : "busy")}"></span>
            </div>
            <div class="proactive-debug-grid">
              <span>此刻</span><b>${E.escapeHTML(state ? state.statusLine : "状态未知")}</b>
              <span>地点</span><b>${E.escapeHTML(state ? state.location : "未知")}</b>
              <span>可打扰度</span><b>${E.escapeHTML(state ? state.interruptibilityLabel : "未知")}</b>
              <span>今日已发</span><b>${row.todayCount}${row.dailyCap ? ` / ${row.dailyCap}` : ""}</b>
              <span>上次主动</span><b>${row.lastSentAt ? E.fmtRelative(row.lastSentAt) : "还没有"}</b>
              <span>上次原因</span><b>${row.lastReason ? E.escapeHTML(E.proactiveEngine.reasonLabel(row.lastReason)) : "还没有"}</b>
              <span>待发意图</span><b>${pending ? `${E.fmtDateTime(pending.dueAt)} · ${E.escapeHTML(E.proactiveEngine.reasonLabel(pending.reason))}` : "暂无"}</b>
              <span>当前门控</span><b>${E.escapeHTML(suppressed)}</b>
              <span>下次可评估</span><b>${E.escapeHTML(nextAt)}</b>
            </div>
          </div>
        `;
      }).join("")}
      <div class="sheet-actions" style="margin-top:12px">
        <button class="btn ghost" type="button" data-sheet-close>关闭</button>
        <button class="btn" type="button" data-action="proactive-tick-now" ${characterId ? `data-id="${E.escapeHTML(characterId)}"` : ""}>${E.icon("refresh", 15)} 现在评估一次</button>
      </div>
      ${characterId ? `<button class="btn ghost" type="button" data-action="proactive-clear-intent" data-id="${E.escapeHTML(characterId)}" style="width:100%;margin-top:8px">清空这个角色的待发意图</button>` : ""}
    `;
    E.openSheet({ title: "主动消息调试", body });
  };

  E.deleteCharacterFlow = async function (id) {
    const character = E.getCharacter(id);
    if (!character) return;
    if (!E.confirm(`删除「${character.name}」以及相关聊天和记忆？`)) return;
    const chatIds = E.state.chats.filter((chat) => (chat.characterIds || []).includes(id)).map((chat) => chat.id);
    for (const chatId of chatIds) {
      const messages = E.state.messages.filter((message) => message.chatId === chatId);
      for (const message of messages) await E.db.del("messages", message.id);
    }
    for (const chatId of chatIds) await E.db.del("chats", chatId);
    const memories = E.state.memories.filter((memory) => memory.characterId === id);
    for (const memory of memories) await E.db.del("memories", memory.id);
    await E.db.del("characters", id);
    E.state.characters = E.state.characters.filter((item) => item.id !== id);
    E.state.chats = E.state.chats.filter((chat) => !chatIds.includes(chat.id));
    E.state.messages = E.state.messages.filter((message) => !chatIds.includes(message.chatId));
    E.state.memories = E.state.memories.filter((memory) => memory.characterId !== id);
    E.closeSheet();
    E.toast("角色已删除");
    E.navigate("#/contacts");
  };

  E.addWorldbookFlow = function (characterId) {
    const character = E.getCharacter(characterId);
    if (!character) return;
    E.formSheet({
      title: "添加世界书",
      fields: [
        { name: "title", label: "标题", placeholder: "例如：常去的店" },
        { name: "keywords", label: "触发词", placeholder: "用逗号分隔，例如：书店, 留白, 下雨", hint: "留空时这条设定会常驻；填写后只在最近对话出现这些词时加入提示词。" },
        { name: "priority", label: "优先级", type: "number", value: 0, step: "1", hint: "数字越大越优先，最多加入 6 条世界书。" },
        { name: "content", label: "内容", type: "textarea", required: true, placeholder: "这个地方、习惯或秘密……" }
      ],
      onSubmit: async (values) => {
        character.worldbook = character.worldbook || [];
        character.worldbook.push({
          id: E.uid("wb"),
          title: values.title.trim() || "设定",
          content: values.content.trim(),
          keywords: parseWorldbookKeywords(values.keywords),
          priority: Number(values.priority) || 0
        });
        await E.db.put("characters", character);
        E.toast("世界书已更新");
        E.renderRoute();
      }
    });
  };

  E.deleteWorldbook = async function (characterId, entryId) {
    const character = E.getCharacter(characterId);
    if (!character) return;
    if (!E.confirm("删除这条世界书？")) return;
    character.worldbook = (character.worldbook || []).filter((entry) => entry.id !== entryId);
    await E.db.put("characters", character);
    E.renderRoute();
  };

  E.addMemoryFlow = function (characterId) {
    const characters = E.state.characters;
    if (!characters.length) {
      E.toast("先创建一个角色");
      return;
    }
    const fields = [];
    if (!characterId) {
      fields.push({
        name: "characterId",
        label: "属于谁",
        type: "select",
        options: characters.map((character) => ({ value: character.id, label: character.name }))
      });
    }
    fields.push(
      { name: "content", label: "记忆内容", type: "textarea", required: true, placeholder: "她应该记住什么？" },
      { name: "layer", label: "记忆层级", type: "select", options: [{ value: "", label: "自动判断" }, ...Object.entries(E.MEMORY_LAYERS).map(([value, item]) => ({ value, label: item.label }))] },
      { name: "importance", label: "重要度 1–5", type: "number", value: 3, step: "1" },
      { name: "pinned", label: "置顶这条记忆", type: "checkbox", value: false },
      { name: "scope", label: "知情范围", type: "select", value: "private", options: [
        { value: "private", label: "仅角色本人" },
        { value: "group", label: "群聊共享" },
        { value: "public", label: "所有角色可见" }
      ], hint: "私聊记忆默认只属于这个角色；群聊共享会出现在群成员的共同记忆里。" }
    );
    E.formSheet({
      title: "添加记忆",
      fields,
      onSubmit: async (values) => {
        const ownerId = characterId || values.characterId;
        const scope = values.scope || "private";
        const knownBy = scope === "private"
          ? [ownerId]
          : E.state.characters.map((character) => character.id);
        const memory = E.normalizeMemory({
          id: E.uid("mem"),
          characterId: ownerId,
          content: values.content.trim(),
          importance: E.clamp(Number(values.importance) || 3, 1, 5),
          pinned: !!values.pinned,
          source: "manual",
          scope,
          knownBy,
          layer: values.layer,
          tags: [],
          sourceChatId: "",
          sourceMessageIds: [],
          confidence: 1,
          lastConfirmedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        E.state.memories.push(memory);
        await E.db.put("memories", memory);
        E.toast("记忆已添加");
        E.renderRoute();
      }
    });
  };

  E.editMemoryFlow = function (id) {
    const memory = E.state.memories.find((item) => item.id === id);
    if (!memory) return;
    const selected = Array.isArray(memory.knownBy) && memory.knownBy.length
      ? memory.knownBy
      : [memory.characterId];
    const knownByFields = E.state.characters.map((character) => ({
      name: `known_${character.id}`,
      label: character.name,
      type: "checkbox",
      value: selected.includes(character.id)
    }));
    E.formSheet({
      title: "编辑记忆",
      fields: [
        { name: "content", label: "记忆内容", type: "textarea", required: true, value: memory.content },
        { name: "layer", label: "记忆层级", type: "select", value: memory.layer, options: Object.entries(E.MEMORY_LAYERS).map(([value, item]) => ({ value, label: item.label })) },
        { name: "importance", label: "重要度 1–5", type: "number", value: memory.importance, step: "1" },
        { name: "pinned", label: "置顶这条记忆", type: "checkbox", value: !!memory.pinned },
        { name: "scope", label: "知情范围", type: "select", value: memory.scope || "private", options: [
          { value: "private", label: "仅角色本人" },
          { value: "group", label: "群聊共享" },
          { value: "public", label: "所有角色可见" }
        ], hint: "私聊只让这个角色知道；群聊共享会让群成员都带着这条记忆。" },
        ...knownByFields
      ],
      submitLabel: "保存记忆",
      onSubmit: async (values) => {
        const scope = values.scope || "private";
        const checked = E.state.characters
          .filter((character) => values[`known_${character.id}`])
          .map((character) => character.id);
        const knownBy = scope === "private"
          ? [memory.characterId]
          : checked.length
            ? checked
            : scope === "public"
              ? E.state.characters.map((character) => character.id)
              : (Array.isArray(memory.knownBy) && memory.knownBy.length ? memory.knownBy : [memory.characterId]);
        const updated = E.normalizeMemory({
          ...memory,
          content: values.content.trim(),
          layer: values.layer,
          importance: E.clamp(Number(values.importance) || 3, 1, 5),
          pinned: !!values.pinned,
          scope,
          knownBy,
          confidence: 1,
          lastConfirmedAt: Date.now(),
          updatedAt: Date.now()
        });
        Object.assign(memory, updated);
        await E.db.put("memories", memory);
        E.toast("记忆已更新");
        E.renderRoute();
      }
    });
  };

  E.deleteMemory = async function (id) {
    if (!E.confirm("删除这条记忆？")) return;
    await E.db.del("memories", id);
    E.state.memories = E.state.memories.filter((memory) => memory.id !== id);
    E.renderRoute();
  };

  E.toggleMemoryPin = async function (id) {
    const memory = E.state.memories.find((item) => item.id === id);
    if (!memory) return;
    memory.pinned = !memory.pinned;
    memory.updatedAt = Date.now();
    await E.db.put("memories", memory);
    E.toast(memory.pinned ? "记忆已置顶" : "已取消置顶");
    E.renderRoute();
  };

  E.startChatWithCharacter = async function (id) {
    const chat = await E.ensureDirectChat(id);
    E.navigate(`#/chat/${chat.id}`);
  };
})();
