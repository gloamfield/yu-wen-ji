(function () {
  "use strict";

  const E = window.Ember;

  const TABS = [
    { id: "memos", label: "备忘录", kind: "memo", icon: "memo" },
    { id: "history", label: "浏览", kind: "history", icon: "history" },
    { id: "drafts", label: "草稿", kind: "draft", icon: "draft" },
    { id: "cart", label: "购物车", kind: "cart", icon: "cart" }
  ];

  function kindMeta(kind) {
    return TABS.find((item) => item.kind === kind) || TABS[0];
  }

  function itemMeta(item) {
    const parts = [];
    if (item.meta && item.meta.price) parts.push(`¥${Number(item.meta.price).toFixed(Number(item.meta.price) % 1 ? 1 : 0)}`);
    if (item.meta && item.meta.qty) parts.push(`× ${item.meta.qty}`);
    if (item.done) parts.push("已完成");
    return parts.join(" · ");
  }

  E.renderHerPhoneHTML = function (characterId) {
    const characters = E.state.characters || [];
    if (!characterId) {
      return `
        <div class="app-page">
          ${E.appHeaderHTML("她的手机", { subtitle: "只属于角色自己的那一面" })}
          <div class="app-body">
            <div class="her-phone-intro">
              这里不是你的聊天记录，而是她手机里留下的痕迹：备忘录、搜索、没发出去的草稿和购物车。它们会跟着生活事件一起变化。
            </div>
            ${characters.length ? characters.map((character) => {
              const summary = E.herPhoneEngine.summary(character.id);
              return `
                <button class="her-phone-character" data-route="#/her-phone/${E.escapeHTML(character.id)}">
                  ${E.avatar(character, "")}
                  <span class="grow" style="text-align:left">
                    <span class="her-phone-name">${E.escapeHTML(character.name)}</span>
                    <span class="her-phone-desc">${E.escapeHTML(character.relationship || "朋友")} · ${summary.total} 条手机痕迹</span>
                  </span>
                  ${E.icon("arrowRight", 16)}
                </button>
              `;
            }).join("") : E.emptyState("contacts", "还没有角色", "先创建一个角色，她的手机才会有东西。")}
          </div>
        </div>
      `;
    }
    const character = E.getCharacter(characterId);
    if (!character) {
      return `<div class="app-page">${E.appHeaderHTML("她的手机")}<div class="app-body">${E.emptyState("device", "角色不存在", "这部手机可能已经被删除了。")}</div></div>`;
    }
    const tabId = TABS.some((item) => item.id === E.state.herPhoneTab) ? E.state.herPhoneTab : "memos";
    const tab = TABS.find((item) => item.id === tabId);
    const items = E.herPhoneEngine.itemsFor(character.id, tab.kind);
    const summary = E.herPhoneEngine.summary(character.id);
    const commitments = typeof E.commitmentEngine !== "undefined"
      ? E.commitmentEngine.pendingFor(character.id).slice(0, 3)
      : [];
    return `
      <div class="app-page">
        ${E.appHeaderHTML("她的手机", {
          subtitle: character.name,
          actions: `<button class="header-btn" data-action="add-herphone-item" data-id="${E.escapeHTML(character.id)}" data-kind="${E.escapeHTML(tab.kind)}" aria-label="添加">${E.icon("plus", 20)}</button>`
        })}
        <div class="app-body">
          <div class="her-phone-owner">
            ${E.avatar(character, "")}
            <div class="grow">
              <div class="her-phone-name">${E.escapeHTML(character.name)} 的手机</div>
              <div class="her-phone-desc">${E.escapeHTML(character.relationship || "朋友")} · ${summary.total} 条痕迹 · 最近更新 ${E.fmtRelative((E.state.life && E.state.life.herPhone && E.state.life.herPhone[character.id] && E.state.life.herPhone[character.id].updatedAt) || Date.now())}</div>
            </div>
          </div>
          <div class="her-phone-tabs">
            ${TABS.map((item) => `
              <button class="her-phone-tab ${item.id === tabId ? "active" : ""}" data-action="her-phone-tab" data-tab="${item.id}">
                ${E.icon(item.icon, 15)}<span>${item.label}</span>
                <b>${summary[item.id] || 0}</b>
              </button>
            `).join("")}
          </div>
          ${items.length ? `<div class="her-phone-list">
            ${items.map((item) => `
              <div class="her-phone-item ${item.done ? "done" : ""}">
                <div class="her-phone-item-icon">${E.icon(kindMeta(item.kind).icon, 17)}</div>
                <div class="grow">
                  <div class="her-phone-item-title">${E.escapeHTML(item.title || "一条痕迹")}</div>
                  <div class="her-phone-item-text">${E.escapeHTML(item.text || "")}</div>
                  <div class="her-phone-item-meta">${E.fmtRelative(item.createdAt)}${itemMeta(item) ? ` · ${E.escapeHTML(itemMeta(item))}` : ""}${item.sourceEventId ? " · 来自生活事件" : ""}</div>
                </div>
                <div class="her-phone-item-actions">
                  ${item.kind === "memo" || item.kind === "cart" ? `<button class="icon-btn" data-action="toggle-herphone-done" data-id="${E.escapeHTML(character.id)}" data-kind="${E.escapeHTML(item.kind)}" data-item="${E.escapeHTML(item.id)}" aria-label="完成">${E.icon("check", 14)}</button>` : ""}
                  <button class="icon-btn" data-action="edit-herphone-item" data-id="${E.escapeHTML(character.id)}" data-kind="${E.escapeHTML(item.kind)}" data-item="${E.escapeHTML(item.id)}" aria-label="编辑">${E.icon("edit", 14)}</button>
                  <button class="icon-btn" data-action="delete-herphone-item" data-id="${E.escapeHTML(character.id)}" data-kind="${E.escapeHTML(item.kind)}" data-item="${E.escapeHTML(item.id)}" aria-label="删除">${E.icon("trash", 14)}</button>
                </div>
              </div>
            `).join("")}
          </div>` : E.emptyState(tab.icon, `还没有${tab.label}`, "生活事件、聊天和剧情线会慢慢在这里留下痕迹。", `<button class="btn" data-action="add-herphone-item" data-id="${E.escapeHTML(character.id)}" data-kind="${E.escapeHTML(tab.kind)}">${E.icon("plus", 16)} 添加一条</button>`)}

          <div class="section-label" style="margin-top:18px">和她有关的连接</div>
          <div class="her-phone-links">
            <button class="her-phone-link" data-action="start-chat" data-id="${E.escapeHTML(character.id)}">${E.icon("chat", 16)}<span>聊天</span></button>
            <button class="her-phone-link" data-route="#/diary">${E.icon("diary", 16)}<span>日记</span></button>
            <button class="her-phone-link" data-route="#/moments">${E.icon("moments", 16)}<span>动态</span></button>
            <button class="her-phone-link" data-route="#/calls">${E.icon("phone", 16)}<span>电话</span></button>
          </div>
          ${commitments.length ? `
            <div class="section-label" style="margin-top:18px">她记着的约定</div>
            ${commitments.map((item) => `<div class="commitment-row"><span>${E.escapeHTML(item.content)}</span><span class="muted tiny">${E.escapeHTML(E.continuity.formatDue(item.dueAt))}</span></div>`).join("")}
          ` : ""}
          <div class="hint" style="margin-top:16px">这些内容由本地生活事件生成，也可以手动添加。它们只属于当前角色，不会自动出现在其他角色的手机里。</div>
        </div>
      </div>
    `;
  };

  E.herPhoneTab = function (tab) {
    E.state.herPhoneTab = TABS.some((item) => item.id === tab) ? tab : "memos";
    E.renderRoute();
  };

  E.herPhoneFormFlow = function (characterId, kind, itemId) {
    const character = E.getCharacter(characterId);
    if (!character) return;
    const meta = kindMeta(kind);
    const existing = itemId
      ? E.herPhoneEngine.itemsFor(characterId, kind).find((item) => item.id === itemId)
      : null;
    const fields = [
      { name: "title", label: "标题", value: existing ? existing.title : "", placeholder: kind === "history" ? "搜索了什么？" : kind === "draft" ? "没发出去的话" : "记一件小事" },
      { name: "text", label: "内容", type: "textarea", value: existing ? existing.text : "", placeholder: "写具体一点，像真的留在手机里。" }
    ];
    if (kind === "cart") {
      fields.push(
        { name: "price", label: "价格", type: "number", value: existing && existing.meta ? existing.meta.price || 0 : 0, step: "0.01" },
        { name: "qty", label: "数量", type: "number", value: existing && existing.meta ? existing.meta.qty || 1 : 1, step: "1" }
      );
    }
    E.formSheet({
      title: existing ? `编辑${meta.label}` : `添加${meta.label}`,
      fields,
      submitLabel: "保存",
      onSubmit: async (values) => {
        if (existing) {
          existing.title = values.title.trim();
          existing.text = values.text.trim();
          if (kind === "cart") existing.meta = { price: Number(values.price) || 0, qty: Number(values.qty) || 1 };
          existing.updatedAt = Date.now();
          await E.saveLifeState();
        } else {
          E.herPhoneEngine.add(characterId, kind, {
            title: values.title.trim(),
            text: values.text.trim(),
            meta: kind === "cart" ? { price: Number(values.price) || 0, qty: Number(values.qty) || 1 } : {}
          });
        }
        E.toast("已保存");
        E.renderRoute();
      }
    });
  };

  E.deleteHerPhoneItem = async function (characterId, kind, itemId) {
    if (!E.confirm("删除这条手机痕迹？")) return;
    await E.herPhoneEngine.remove(characterId, kind, itemId);
    E.toast("已删除");
    E.renderRoute();
  };

  E.toggleHerPhoneDone = async function (characterId, kind, itemId) {
    await E.herPhoneEngine.toggleDone(characterId, kind, itemId);
    E.renderRoute();
  };
})();
