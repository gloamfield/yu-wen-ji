(function () {
  "use strict";

  const E = window.Ember;

  // ---------- moments ----------

  E.renderMomentsHTML = function () {
    const moments = E.state.moments.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return `
      <div class="app-page">
        ${E.appHeaderHTML("动态", {
          subtitle: "角色们的生活碎片",
          actions: `
            <button class="header-btn" data-action="ai-moment" aria-label="让角色发动态">${E.icon("sparkles", 18)}</button>
            <button class="header-btn" data-action="compose-moment" aria-label="发布动态">${E.icon("plus", 20)}</button>
          `
        })}
        <div class="app-body">
          ${moments.length ? moments.map((moment) => E.momentCardHTML(moment)).join("") : E.emptyState("moments", "还没有动态", "让角色发一条，或者自己写一条。", `<button class="btn" data-action="ai-moment">${E.icon("sparkles", 16)} 让角色发动态</button>`)}
        </div>
      </div>
    `;
  };

  E.momentCardHTML = function (moment) {
    const character = E.getCharacter(moment.characterId);
    const name = character ? character.name : (moment.author || "某个人");
    const avatar = character ? E.avatar(character, "") : `<span class="avatar" style="background:#8d8588">${E.escapeHTML(name.slice(0, 1))}</span>`;
    const image = E.safeImage(moment.image);
    const comments = Array.isArray(moment.comments) ? moment.comments : [];
    return `
      <div class="card moment-card">
        <div class="moment-head">
          ${avatar}
          <div class="grow">
            <div class="moment-name">${E.escapeHTML(name)}</div>
            <div class="moment-time">${E.fmtRelative(moment.createdAt)}</div>
          </div>
          <button class="icon-btn" data-action="delete-moment" data-id="${E.escapeHTML(moment.id)}" aria-label="删除">${E.icon("more", 17)}</button>
        </div>
        <div class="moment-text">${E.escapeHTML(moment.content || "")}</div>
        ${image ? `<img class="moment-image" src="${E.escapeHTML(image)}" alt="动态图片" data-action="view-moment-image" data-src="${E.escapeHTML(image)}">` : ""}
        <div class="moment-actions">
          <button class="moment-action ${moment.liked ? "liked" : ""}" data-action="like-moment" data-id="${E.escapeHTML(moment.id)}">
            ${E.icon("heart", 15)} ${Number(moment.likes || 0)}
          </button>
          <button class="moment-action" data-action="comment-moment" data-id="${E.escapeHTML(moment.id)}">
            ${E.icon("comment", 15)} ${comments.length}
          </button>
        </div>
        ${comments.length ? `<div class="comments">
          ${comments.map((comment) => `<div class="comment"><b>${E.escapeHTML(comment.name || "我")}</b>${comment.replyTo ? ` <span class="comment-reply">回 ${E.escapeHTML(comment.replyTo)}</span>` : ""}：${E.escapeHTML(comment.text || "")}</div>`).join("")}
        </div>` : ""}
      </div>
    `;
  };

  E.composeMomentFlow = function () {
    if (!E.state.characters.length) {
      E.toast("先创建一个角色");
      return;
    }
    E.formSheet({
      title: "发布动态",
      fields: [
        {
          name: "characterId",
          label: "以谁的身份",
          type: "select",
          options: E.state.characters.map((character) => ({ value: character.id, label: character.name }))
        },
        { name: "content", label: "正文", type: "textarea", required: true, placeholder: "今天发生了什么？" },
        { name: "image", label: "配图（可选）", type: "file", accept: "image/*", readAsDataUrl: true }
      ],
      submitLabel: "发布",
      onSubmit: async (values) => {
        const moment = {
          id: E.uid("moment"),
          characterId: values.characterId,
          content: values.content.trim(),
          image: values.imageDataUrl || "",
          likes: 0,
          liked: false,
          comments: [],
          createdAt: Date.now()
        };
        E.state.moments.push(moment);
        await E.db.put("moments", moment);
        E.toast("动态已发布");
        E.renderRoute();
      }
    });
  };

  E.aiMomentFlow = async function () {
    if (!E.state.characters.length) {
      E.toast("先创建一个角色");
      return;
    }
    const character = E.state.characters[Math.floor(Math.random() * E.state.characters.length)];
    E.toast(`正在让「${character.name}」发动态……`, 1800);
    try {
      const text = await E.generateMoment(character);
      const moment = {
        id: E.uid("moment"),
        characterId: character.id,
        content: String(text || "").trim() || "今天没有发生什么。",
        image: "",
        likes: 0,
        liked: false,
        comments: [],
        createdAt: Date.now()
      };
      E.state.moments.push(moment);
      await E.db.put("moments", moment);
      E.toast(`${character.name} 发了一条动态`);
      if (E.parseRoute().name !== "moments") {
        await E.addNotification({
          title: character.name,
          body: moment.content.slice(0, 80),
          app: "moments",
          route: "#/moments"
        });
      }
      E.renderRoute();
    } catch (error) {
      E.toast(E.humanError(error), 4200);
    }
  };

  E.likeMoment = async function (id) {
    const moment = E.state.moments.find((item) => item.id === id);
    if (!moment) return;
    moment.liked = !moment.liked;
    moment.likes = Math.max(0, Number(moment.likes || 0) + (moment.liked ? 1 : -1));
    await E.db.put("moments", moment);
    E.renderRoute();
  };

  E.commentMomentFlow = function (id) {
    const moment = E.state.moments.find((item) => item.id === id);
    if (!moment) return;
    E.formSheet({
      title: "评论",
      fields: [
        { name: "text", label: "说点什么", type: "textarea", required: true, placeholder: "写一句评论……" }
      ],
      submitLabel: "发送",
      onSubmit: async (values) => {
        moment.comments = Array.isArray(moment.comments) ? moment.comments : [];
        moment.comments.push({
          id: E.uid("cmt"),
          name: E.state.settings.userName || "我",
          text: values.text.trim(),
          createdAt: Date.now()
        });
        await E.db.put("moments", moment);
        E.renderRoute();
      }
    });
  };

  E.deleteMomentFlow = async function (id) {
    if (!E.confirm("删除这条动态？")) return;
    await E.db.del("moments", id);
    E.state.moments = E.state.moments.filter((item) => item.id !== id);
    E.renderRoute();
  };

  E.viewMomentImage = function (src) {
    const image = E.safeImage(src);
    if (!image) return;
    E.openSheet({
      title: "图片",
      body: `<img src="${E.escapeHTML(image)}" alt="动态图片" style="width:100%;border-radius:16px;display:block">`
    });
  };

  // ---------- calls ----------

  E.renderCallsHTML = function () {
    const calls = E.state.calls.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return `
      <div class="app-page">
        ${E.appHeaderHTML("电话", {
          subtitle: "有些话，适合直接说",
          actions: `<button class="header-btn" data-action="new-call" aria-label="拨号">${E.icon("phone", 19)}</button>`
        })}
        <div class="app-body">
          ${calls.length ? `<div class="card" style="padding:2px 12px">
            ${calls.map((call) => {
              const character = E.getCharacter(call.characterId);
              if (!character) return "";
              const label = call.type === "missed" ? "未接来电" : call.type === "incoming" ? "来电" : "呼出";
              const duration = call.duration ? ` · ${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, "0")}` : "";
              return `
                <div class="call-row">
                  ${E.avatar(character, "")}
                  <div class="grow">
                    <div class="character-name">${E.escapeHTML(character.name)}</div>
                    <div class="call-type ${call.type === "missed" ? "missed" : ""}">${label}${duration} · ${E.fmtRelative(call.createdAt)}</div>
                  </div>
                  <button class="icon-btn" data-action="call-character" data-id="${E.escapeHTML(character.id)}" aria-label="拨打">${E.icon("phone", 18)}</button>
                </div>
              `;
            }).join("")}
          </div>` : E.emptyState("phone", "还没有通话记录", "给某个角色打个电话吧。", `<button class="btn" data-action="new-call">${E.icon("phone", 16)} 拨号</button>`)}
        </div>
      </div>
    `;
  };

  E.newCallFlow = function () {
    if (!E.state.characters.length) {
      E.toast("先创建一个角色");
      return;
    }
    E.formSheet({
      title: "拨号",
      fields: [
        {
          name: "characterId",
          label: "打给谁",
          type: "select",
          options: E.state.characters.map((character) => ({ value: character.id, label: `${character.name} · ${character.relationship || "朋友"}` }))
        }
      ],
      submitLabel: "拨打",
      onSubmit: async (values) => {
        E.closeSheet();
        E.startCall(values.characterId);
      }
    });
  };

  E.startCall = function (characterId) {
    const character = E.getCharacter(characterId);
    if (!character) return;
    if (document.querySelector(".call-overlay")) return;
    E.state.callCharacterId = characterId;
    E.state.callSeconds = 0;
    const phone = document.getElementById("phone");
    phone.insertAdjacentHTML("beforeend", `
      <div class="call-overlay" id="call-overlay">
        <div class="call-avatar" style="background:linear-gradient(135deg, ${E.escapeHTML(character.color || "#c87f8a")}, #8b6f8f)">${E.avatar(character, "lg").replace(/^<span[^>]*>|<\/span>$/g, "")}</div>
        <div class="call-name">${E.escapeHTML(character.name)}</div>
        <div class="call-status" id="call-status">正在呼叫……</div>
        <div class="call-line" id="call-line">${E.escapeHTML(character.greeting || "……")}</div>
        <div class="call-actions">
          <button class="call-btn speaker" data-action="speaker-call" aria-label="免提">${E.icon("speaker", 24)}</button>
          <button class="call-btn hangup" data-action="hangup-call" aria-label="挂断">${E.icon("phoneOff", 25)}</button>
        </div>
      </div>
    `);
    const status = document.getElementById("call-status");
    const line = document.getElementById("call-line");
    setTimeout(() => {
      if (!document.getElementById("call-overlay")) return;
      status.textContent = "已接通";
      E.state.callTimer = setInterval(() => {
        E.state.callSeconds += 1;
        const s = E.state.callSeconds;
        status.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      }, 1000);
      E.generateCallLine(character, "").then((text) => {
        if (line && document.getElementById("call-overlay")) {
          line.textContent = text;
          E.speak(text);
        }
      }).catch((error) => {
        if (line) line.textContent = E.humanError(error);
      });
    }, 1400);
  };

  E.hangupCall = async function () {
    const characterId = E.state.callCharacterId;
    const seconds = E.state.callSeconds;
    if (E.state.callTimer) clearInterval(E.state.callTimer);
    E.state.callTimer = null;
    E.state.callSeconds = 0;
    E.state.callCharacterId = null;
    const overlay = document.getElementById("call-overlay");
    if (overlay) overlay.remove();
    if (!characterId) return;
    const call = {
      id: E.uid("call"),
      characterId,
      type: "outgoing",
      duration: seconds,
      createdAt: Date.now()
    };
    E.state.calls.push(call);
    await E.db.put("calls", call);
    E.toast("通话已结束");
    if (E.parseRoute().name === "calls") E.renderRoute();
  };

  // ---------- forum ----------

  E.renderForumHTML = function () {
    const threads = E.state.forum.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return `
      <div class="app-page">
        ${E.appHeaderHTML("论坛", {
          subtitle: "只有这台手机里的人",
          actions: `<button class="header-btn" data-action="new-forum" aria-label="发帖">${E.icon("plus", 20)}</button>`
        })}
        <div class="app-body">
          ${threads.length ? threads.map((thread) => `
            <div class="card forum-card" data-route="#/forum/${E.escapeHTML(thread.id)}">
              <div class="forum-title">${E.escapeHTML(thread.title || "无标题")}</div>
              <div class="forum-excerpt">${E.escapeHTML(thread.content || "")}</div>
              <div class="forum-meta">
                <span>${E.escapeHTML(thread.author || "匿名")}</span>
                <span>${(thread.replies || []).length} 回复</span>
                <span>${E.fmtRelative(thread.createdAt)}</span>
              </div>
            </div>
          `).join("") : E.emptyState("forum", "论坛还没有帖子", "发一个只有你们能看见的帖子。", `<button class="btn" data-action="new-forum">${E.icon("plus", 16)} 发帖</button>`)}
        </div>
      </div>
    `;
  };

  E.renderForumThreadHTML = function (threadId) {
    const thread = E.state.forum.find((item) => item.id === threadId);
    if (!thread) return `<div class="app-page">${E.appHeaderHTML("论坛")}<div class="app-body">${E.emptyState("forum", "帖子不存在", "它可能已经被删除了。")}</div></div>`;
    const replies = Array.isArray(thread.replies) ? thread.replies : [];
    return `
      <div class="app-page">
        ${E.appHeaderHTML("帖子", {
          actions: `<button class="header-btn" data-action="delete-forum" data-id="${E.escapeHTML(thread.id)}" aria-label="删除">${E.icon("trash", 17)}</button>`
        })}
        <div class="app-body">
          <div class="card forum-post">
            <h3>${E.escapeHTML(thread.title || "无标题")}</h3>
            <div class="forum-meta"><span>${E.escapeHTML(thread.author || "匿名")}</span><span>${E.fmtRelative(thread.createdAt)}</span></div>
            <div class="forum-body">${E.escapeHTML(thread.content || "")}</div>
          </div>
          <div class="section-label">回复 · ${replies.length}</div>
          ${replies.map((reply) => `
            <div class="reply">
              <b>${E.escapeHTML(reply.author || "匿名")}</b>
              <span class="muted tiny"> · ${E.fmtRelative(reply.createdAt)}</span>
              <p>${E.escapeHTML(reply.text || "")}</p>
            </div>
          `).join("") || `<div class="muted tiny" style="padding:8px 4px 14px">还没有回复。</div>`}
          <button class="btn soft" data-action="reply-forum" data-id="${E.escapeHTML(thread.id)}" style="width:100%;margin-top:8px">${E.icon("comment", 16)} 回复</button>
        </div>
      </div>
    `;
  };

  E.newForumFlow = function () {
    E.formSheet({
      title: "发帖",
      fields: [
        { name: "title", label: "标题", required: true, placeholder: "想说什么？" },
        { name: "content", label: "正文", type: "textarea", required: true, placeholder: "写点什么……" }
      ],
      submitLabel: "发布",
      onSubmit: async (values) => {
        const thread = {
          id: E.uid("forum"),
          title: values.title.trim(),
          content: values.content.trim(),
          author: E.state.settings.userName || "我",
          replies: [],
          createdAt: Date.now()
        };
        E.state.forum.push(thread);
        await E.db.put("forum", thread);
        E.toast("帖子已发布");
        E.navigate(`#/forum/${thread.id}`);
      }
    });
  };

  E.replyForumFlow = function (threadId) {
    const thread = E.state.forum.find((item) => item.id === threadId);
    if (!thread) return;
    E.formSheet({
      title: "回复",
      fields: [{ name: "text", label: "内容", type: "textarea", required: true, placeholder: "写一句回复……" }],
      submitLabel: "发送",
      onSubmit: async (values) => {
        thread.replies = Array.isArray(thread.replies) ? thread.replies : [];
        thread.replies.push({
          id: E.uid("reply"),
          author: E.state.settings.userName || "我",
          text: values.text.trim(),
          createdAt: Date.now()
        });
        await E.db.put("forum", thread);
        E.renderRoute();
      }
    });
  };

  E.deleteForumFlow = async function (threadId) {
    if (!E.confirm("删除这个帖子？")) return;
    await E.db.del("forum", threadId);
    E.state.forum = E.state.forum.filter((item) => item.id !== threadId);
    E.toast("帖子已删除");
    E.navigate("#/forum");
  };
})();
