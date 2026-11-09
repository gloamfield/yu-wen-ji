(function () {
  "use strict";

  const E = window.Ember;

  E.renderChatListHTML = function () {
    const chats = E.state.chats.slice().sort((a, b) => Number(b.lastMessageAt || 0) - Number(a.lastMessageAt || 0));
    return `
      <div class="app-page">
        ${E.appHeaderHTML("聊天", {
          back: false,
          actions: `
            <button class="header-btn" data-action="import-chat" aria-label="导入聊天">${E.icon("upload", 18)}</button>
            <button class="header-btn" data-action="new-chat" aria-label="新建聊天">${E.icon("plus", 20)}</button>
          `
        })}
        <div class="app-body">
          ${E.activeProvider() === "demo" ? `<div class="chat-banner">${E.icon("sparkles", 14)} 当前是演示模式。去设置里接入 OpenAI、Claude、Gemini、DeepSeek 或 SillyTavern 后端。</div>` : ""}
          ${chats.length ? `<div class="chat-list">
            ${chats.map((chat) => {
              const last = E.getLastMessage(chat.id);
              const character = E.chatAvatar(chat);
              const preview = last
                ? `${chat.type === "group" && last.characterId ? `${(E.getCharacter(last.characterId) || {}).name || ""}：` : ""}${last.content}`
                : "还没有消息";
              return `
                <div class="chat-row" data-route="#/chat/${E.escapeHTML(chat.id)}">
                  ${chat.type === "group" ? `<span class="avatar" style="background:linear-gradient(135deg,#8b6f8f,#5d4c68)">${E.icon("group", 20)}</span>` : E.avatar(character, "")}
                  <div class="chat-main">
                    <div class="chat-name-line">
                      <div class="chat-name">${E.escapeHTML(E.chatTitle(chat))}</div>
                      ${chat.type === "group" ? `<span class="pill">群聊</span>` : ""}
                    </div>
                    <div class="chat-preview">${E.escapeHTML(preview)}</div>
                  </div>
                  <div class="chat-side">
                    <div class="chat-time">${E.fmtRelative(chat.lastMessageAt)}</div>
                    ${Number(chat.unread) > 0 ? `<div class="unread-dot">${chat.unread > 99 ? "99+" : chat.unread}</div>` : ""}
                  </div>
                </div>
              `;
            }).join("")}
          </div>` : E.emptyState("chat", "还没有聊天", "创建一个角色，或者直接开始一段对话。", `<button class="btn" data-action="new-chat">${E.icon("plus", 16)} 新建聊天</button>`)}
        </div>
      </div>
    `;
  };

  E.renderChatThreadHTML = function (chatId) {
    const chat = E.getChat(chatId);
    if (!chat) {
      return `<div class="app-page">${E.appHeaderHTML("聊天")}<div class="app-body">${E.emptyState("chat", "聊天不存在", "它可能已经被删除了。")}</div></div>`;
    }
    if (chat.unread) {
      chat.unread = 0;
      E.saveChat(chat);
    }
    const messages = E.getChatMessages(chat.id);
    const members = (chat.characterIds || []).map((id) => E.getCharacter(id)).filter(Boolean);
    const directCharacter = chat.type === "direct" ? members[0] : null;
    const subtitle = chat.type === "group"
      ? members.map((item) => item.name).join(" · ")
      : directCharacter ? directCharacter.relationship : "";
    const actions = chat.type === "direct" && directCharacter
      ? `<button class="header-btn" data-action="call-character" data-id="${E.escapeHTML(directCharacter.id)}" aria-label="打电话">${E.icon("phone", 18)}</button>
         <button class="header-btn" data-action="chat-menu" data-id="${E.escapeHTML(chat.id)}" aria-label="更多">${E.icon("more", 18)}</button>`
      : `<button class="header-btn" data-action="chat-menu" data-id="${E.escapeHTML(chat.id)}" aria-label="更多">${E.icon("more", 18)}</button>`;
    return `
      <div class="app-page">
        ${E.appHeaderHTML(E.chatTitle(chat), { subtitle, actions })}
        <div class="thread-wrap">
          ${E.activeProvider() === "demo" ? `<div class="chat-banner">${E.icon("sparkles", 14)} 演示模式 · 在设置里接入真实模型</div>` : ""}
          <div class="thread" id="thread">
            ${messages.length ? messages.map((message) => E.messageHTML(message, chat)).join("") : E.emptyState("chat", "还没有消息", "先说点什么吧。")}
          </div>
          ${E.chatInputHTML()}
        </div>
      </div>
    `;
  };

  E.messageHTML = function (message, chat) {
    const isUser = message.role === "user";
    const character = message.characterId ? E.getCharacter(message.characterId) : null;
    const showName = !isUser && chat.type === "group" && character;
    const nameHTML = showName ? `<div class="msg-name">${E.escapeHTML(character.name)}</div>` : "";
    const content = message.streaming && !message.content
      ? `<span class="typing"><i></i><i></i><i></i></span>`
      : E.escapeHTML(message.content || "");
    const avatarHTML = isUser
      ? `<span class="avatar xs" style="background:#8d8588">${E.escapeHTML((E.state.settings.userName || "我").slice(0, 1))}</span>`
      : character ? E.avatar(character, "xs") : `<span class="avatar xs" style="background:#8b6f8f">${E.icon("sparkles", 12)}</span>`;
    return `
      <div class="msg ${isUser ? "user" : "assistant"}" data-message-id="${E.escapeHTML(message.id)}">
        ${avatarHTML}
        <div class="msg-bubble-wrap">
          ${nameHTML}
          <div class="msg-bubble">${content}</div>
          <div class="msg-time">${E.fmtClock(message.createdAt)}${message.streaming ? " · 正在输入" : ""}</div>
        </div>
      </div>
    `;
  };

  E.chatInputHTML = function () {
    return `
      <div class="chat-input">
        <textarea id="chat-input" rows="1" placeholder="说点什么……" ${E.state.generating ? "disabled" : ""}></textarea>
        ${E.state.generating
          ? `<button class="send-btn stop-btn" data-action="stop-generation" aria-label="停止">${E.icon("pause", 19)}</button>`
          : `<button class="send-btn" data-action="send-message" aria-label="发送">${E.icon("send", 19)}</button>`}
      </div>
    `;
  };

  E.newChatFlow = function () {
    const characters = E.state.characters;
    if (!characters.length) {
      E.toast("先创建一个角色");
      return;
    }
    E.openSheet({
      title: "新建聊天",
      body: `
        <form data-new-chat-form>
          <div class="field">
            <label>聊天类型</label>
            <select name="mode" data-chat-mode>
              <option value="direct">单聊</option>
              <option value="group">群聊</option>
            </select>
          </div>
          <div data-direct-fields>
            <div class="field">
              <label>角色</label>
              <select name="characterId">
                ${characters.map((character) => `<option value="${E.escapeHTML(character.id)}">${E.escapeHTML(character.name)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div data-group-fields hidden>
            <div class="field">
              <label>群名</label>
              <input name="title" placeholder="例如：晚风三人组">
            </div>
            <div class="field">
              <label>选择角色（至少两个）</label>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${characters.map((character) => `
                  <label style="display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid var(--line);border-radius:12px">
                    <input type="checkbox" name="groupIds" value="${E.escapeHTML(character.id)}" style="width:auto">
                    <span>${E.escapeHTML(character.name)}</span>
                  </label>
                `).join("")}
              </div>
            </div>
          </div>
          <div class="sheet-actions">
            <button class="btn ghost" type="button" data-sheet-close>取消</button>
            <button class="btn" type="submit">开始聊天</button>
          </div>
        </form>
      `,
      onMount(wrap) {
        const form = wrap.querySelector("[data-new-chat-form]");
        const mode = form.querySelector("[data-chat-mode]");
        const direct = form.querySelector("[data-direct-fields]");
        const group = form.querySelector("[data-group-fields]");
        mode.addEventListener("change", () => {
          const isGroup = mode.value === "group";
          direct.hidden = isGroup;
          group.hidden = !isGroup;
        });
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (mode.value === "group") {
            const ids = Array.from(form.querySelectorAll('input[name="groupIds"]:checked')).map((input) => input.value);
            if (ids.length < 2) {
              E.toast("群聊至少选两个角色");
              return;
            }
            const chat = await E.ensureGroupChat(ids, form.elements.title.value.trim() || "小群");
            E.closeSheet();
            E.navigate(`#/chat/${chat.id}`);
          } else {
            const chat = await E.ensureDirectChat(form.elements.characterId.value);
            E.closeSheet();
            E.navigate(`#/chat/${chat.id}`);
          }
        });
      }
    });
  };

  E.getChatInputValue = function () {
    const input = document.getElementById("chat-input");
    return input ? input.value.trim() : "";
  };

  E.clearChatInput = function () {
    const input = document.getElementById("chat-input");
    if (input) input.value = "";
  };

  E.refreshThreadMessages = function (chat) {
    const thread = document.getElementById("thread");
    if (!thread || !chat) return;
    const messages = E.getChatMessages(chat.id);
    thread.innerHTML = messages.length
      ? messages.map((message) => E.messageHTML(message, chat)).join("")
      : E.emptyState("chat", "还没有消息", "先说点什么吧。");
    thread.scrollTop = thread.scrollHeight;
  };

  E.sendChatMessage = async function (chatId) {
    const chat = E.getChat(chatId);
    if (!chat || E.state.generating) return;
    const text = E.getChatInputValue();
    if (!text) return;
    E.clearChatInput();
    const message = {
      id: E.uid("msg"),
      chatId: chat.id,
      role: "user",
      content: text,
      createdAt: Date.now()
    };
    E.state.messages.push(message);
    await E.saveMessage(message);
    chat.lastMessageAt = message.createdAt;
    await E.saveChat(chat);
    E.renderRoute();
    await E.runAssistantReply(chat);
  };

  E.runAssistantReply = async function (chat) {
    if (!chat || E.state.generating) return;
    E.state.generating = true;
    E.state.abortController = new AbortController();
    const signal = E.state.abortController.signal;
    const replyId = E.uid("reply");
    const placeholder = {
      id: E.uid("msg"),
      chatId: chat.id,
      role: "assistant",
      characterId: null,
      content: "",
      streaming: true,
      createdAt: Date.now(),
      replyId
    };
    E.state.messages.push(placeholder);
    E.renderRoute();

    try {
      const result = await E.generateChatReply(chat, (delta) => {
        placeholder.content += delta;
        E.updateStreamingBubble(placeholder.id, placeholder.content);
      }, signal);
      const fullText = String(result.text || "").trim();
      const segments = E.state.settings.segmentReplies === false
        ? [fullText]
        : E.splitChatReply(fullText, { maxSegments: 4 });
      const finalSegments = segments.length ? segments : [fullText || "……"];

      placeholder.content = finalSegments[0];
      placeholder.characterId = result.characterId;
      placeholder.streaming = false;
      placeholder.createdAt = Date.now();
      await E.saveMessage(placeholder);
      chat.lastMessageAt = placeholder.createdAt;
      await E.saveChat(chat);
      E.refreshThreadMessages(chat);

      for (let index = 1; index < finalSegments.length; index += 1) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        const typing = {
          id: E.uid("msg"),
          chatId: chat.id,
          role: "assistant",
          characterId: result.characterId,
          content: "",
          streaming: true,
          createdAt: Date.now(),
          replyId
        };
        E.state.messages.push(typing);
        E.refreshThreadMessages(chat);
        const delay = E.state.settings.typingDelay === false
          ? 0
          : E.chatSegmentDelay(finalSegments[index], index);
        if (delay > 0) await E.sleep(delay);
        if (signal.aborted) {
          E.state.messages = E.state.messages.filter((item) => item.id !== typing.id);
          E.refreshThreadMessages(chat);
          throw new DOMException("Aborted", "AbortError");
        }
        typing.content = finalSegments[index];
        typing.streaming = false;
        typing.createdAt = Date.now();
        await E.saveMessage(typing);
        chat.lastMessageAt = typing.createdAt;
        await E.saveChat(chat);
        E.refreshThreadMessages(chat);
      }

      const latestUser = [...E.getChatMessages(chat.id)].reverse().find((message) => message.role === "user");
      void E.maybeExtractMemories(chat, placeholder.characterId, latestUser ? latestUser.content : "", fullText);
      if (E.state.settings.autoSpeak) E.speak(fullText);
      const activeRoute = E.parseRoute();
      if (!(activeRoute.name === "chat" && activeRoute.args[0] === chat.id)) {
        chat.unread = (Number(chat.unread) || 0) + 1;
        await E.saveChat(chat);
        const character = E.getCharacter(placeholder.characterId);
        await E.addNotification({
          title: character ? character.name : E.chatTitle(chat),
          body: fullText.slice(0, 80),
          app: "chat",
          route: `#/chat/${chat.id}`
        });
      }
    } catch (error) {
      const human = E.humanError(error);
      if (error && error.name === "AbortError") {
        E.state.messages = E.state.messages.filter((item) => !(item.replyId === replyId && item.streaming && !item.content));
        if (!placeholder.content) {
          E.state.messages = E.state.messages.filter((item) => item.id !== placeholder.id);
        } else {
          placeholder.streaming = false;
          await E.saveMessage(placeholder);
        }
        E.toast("已停止生成");
      } else {
        E.state.messages = E.state.messages.filter((item) => !(item.replyId === replyId && item.streaming && !item.content));
        if (placeholder.content) {
          placeholder.streaming = false;
          await E.saveMessage(placeholder);
        } else {
          E.state.messages = E.state.messages.filter((item) => item.id !== placeholder.id);
        }
        E.toast(human, 4200);
      }
    } finally {
      E.state.generating = false;
      E.state.abortController = null;
      if (E.parseRoute().name === "chat" && E.parseRoute().args[0] === chat.id) {
        E.renderRoute();
      } else {
        E.renderStatus();
      }
    }
  };

  E.updateStreamingBubble = function (messageId, text) {
    const node = document.querySelector(`[data-message-id="${messageId}"] .msg-bubble`);
    if (node) {
      node.textContent = text || "";
      const thread = document.getElementById("thread");
      if (thread) thread.scrollTop = thread.scrollHeight;
    }
  };

  E.stopGeneration = function () {
    if (E.state.abortController) {
      E.state.abortController.abort();
    }
  };

  E.regenerateLast = async function (chatId) {
    const chat = E.getChat(chatId);
    if (!chat || E.state.generating) return;
    const messages = E.getChatMessages(chat.id);
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") {
      E.toast("最后一条不是角色回复");
      return;
    }
    const replyId = last.replyId;
    const remove = replyId
      ? messages.filter((item) => item.role === "assistant" && item.replyId === replyId)
      : [last];
    const removeIds = new Set(remove.map((item) => item.id));
    E.state.messages = E.state.messages.filter((item) => !removeIds.has(item.id));
    for (const item of remove) await E.db.del("messages", item.id);
    E.renderRoute();
    await E.runAssistantReply(chat);
  };

  E.chatMenuFlow = function (chatId) {
    const chat = E.getChat(chatId);
    if (!chat) return;
    E.openSheet({
      title: E.chatTitle(chat),
      body: `
        <div class="settings-group card">
          <div class="settings-row" data-action="regenerate" data-id="${E.escapeHTML(chat.id)}">
            <div class="settings-icon">${E.icon("refresh", 17)}</div>
            <div class="grow"><div class="settings-label">重新生成上一条</div><div class="settings-desc">让角色再回一次</div></div>
          </div>
          <div class="settings-row" data-action="extract-memory" data-id="${E.escapeHTML(chat.id)}">
            <div class="settings-icon">${E.icon("memory", 17)}</div>
            <div class="grow"><div class="settings-label">提炼最近记忆</div><div class="settings-desc">从最近对话里整理长期事实</div></div>
          </div>
          <div class="settings-row" data-action="open-memory-library">
            <div class="settings-icon">${E.icon("book", 17)}</div>
            <div class="grow"><div class="settings-label">打开记忆库</div><div class="settings-desc">查看角色记住的所有事</div></div>
          </div>
          <div class="settings-row" data-action="export-chat" data-id="${E.escapeHTML(chat.id)}">
            <div class="settings-icon">${E.icon("download", 17)}</div>
            <div class="grow"><div class="settings-label">导出聊天</div><div class="settings-desc">JSON 格式，可迁移</div></div>
          </div>
          <div class="settings-row" data-action="clear-chat" data-id="${E.escapeHTML(chat.id)}">
            <div class="settings-icon" style="background:rgba(201,79,85,.12);color:var(--danger)">${E.icon("trash", 17)}</div>
            <div class="grow"><div class="settings-label text-danger">清空聊天记录</div><div class="settings-desc">保留角色，删除消息</div></div>
          </div>
          <div class="settings-row" data-action="delete-chat" data-id="${E.escapeHTML(chat.id)}">
            <div class="settings-icon" style="background:rgba(201,79,85,.12);color:var(--danger)">${E.icon("close", 17)}</div>
            <div class="grow"><div class="settings-label text-danger">删除聊天</div><div class="settings-desc">从列表里移除这个聊天</div></div>
          </div>
        </div>
      `
    });
  };

  E.manualExtractMemories = async function (chatId) {
    const chat = E.getChat(chatId);
    if (!chat) return;
    const messages = E.getChatMessages(chat.id);
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant" && message.characterId);
    const character = chat.type === "group"
      ? (lastAssistant && E.getCharacter(lastAssistant.characterId)) || E.getCharacter((chat.characterIds || [])[0])
      : E.getCharacter((chat.characterIds || [])[0]);
    if (!character) {
      E.toast("这个聊天还没有角色");
      return;
    }
    E.closeSheet();
    E.toast("正在整理最近对话……", 1600);
    const result = await E.maybeExtractMemories(chat, character.id, "", "", { force: true });
    if (!result.added.length && !result.merged.length) E.toast("最近对话里没有发现新的长期记忆");
  };

  E.exportChat = function (chatId) {
    const chat = E.getChat(chatId);
    if (!chat) return;
    const payload = {
      format: "ember-chat",
      version: 1,
      exportedAt: new Date().toISOString(),
      chat: JSON.parse(JSON.stringify(chat)),
      messages: E.getChatMessages(chat.id)
    };
    E.download(`${E.chatTitle(chat)}-聊天记录.json`, JSON.stringify(payload, null, 2));
    E.closeSheet();
  };

  E.clearChat = async function (chatId) {
    if (!E.confirm("清空这个聊天的所有消息？")) return;
    const chat = E.getChat(chatId);
    if (!chat) return;
    const messages = E.state.messages.filter((message) => message.chatId === chat.id);
    for (const message of messages) await E.db.del("messages", message.id);
    E.state.messages = E.state.messages.filter((message) => message.chatId !== chat.id);
    chat.lastMessageAt = Date.now();
    await E.saveChat(chat);
    E.closeSheet();
    E.toast("聊天已清空");
    E.renderRoute();
  };

  E.deleteChat = async function (chatId) {
    if (!E.confirm("删除这个聊天？")) return;
    const messages = E.state.messages.filter((message) => message.chatId === chatId);
    for (const message of messages) await E.db.del("messages", message.id);
    await E.db.del("chats", chatId);
    E.state.messages = E.state.messages.filter((message) => message.chatId !== chatId);
    E.state.chats = E.state.chats.filter((chat) => chat.id !== chatId);
    E.closeSheet();
    E.toast("聊天已删除");
    E.navigate("#/chat");
  };

  E.importChatFlow = function () {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const raw = await E.readFileAsText(file);
        const data = JSON.parse(raw);
        let chatData = data.chat || null;
        let messages = Array.isArray(data.messages) ? data.messages : (Array.isArray(data) ? data : []);
        if (!chatData && messages.length) {
          chatData = {
            type: "direct",
            title: "导入的聊天",
            characterIds: []
          };
        }
        if (!chatData) throw new Error("没有找到聊天数据");
        const chat = {
          id: E.uid("chat"),
          type: chatData.type === "group" ? "group" : "direct",
          title: String(chatData.title || "导入的聊天"),
          characterIds: Array.isArray(chatData.characterIds) ? chatData.characterIds.filter((id) => E.getCharacter(id)) : [],
          unread: 0,
          lastMessageAt: Date.now(),
          createdAt: Date.now()
        };
        if (!chat.characterIds.length && chat.type === "direct") {
          const match = E.state.characters.find((character) => character.name === chat.title);
          if (match) chat.characterIds = [match.id];
        }
        const newMessages = messages.map((message) => ({
          id: E.uid("msg"),
          chatId: chat.id,
          role: message.role === "assistant" ? "assistant" : "user",
          characterId: message.characterId && E.getCharacter(message.characterId) ? message.characterId : (chat.characterIds[0] || null),
          content: String(message.content || ""),
          createdAt: Number(message.createdAt) || Date.now()
        })).filter((message) => message.content);
        if (!newMessages.length) throw new Error("聊天里没有消息");
        chat.lastMessageAt = newMessages[newMessages.length - 1].createdAt;
        E.state.chats.push(chat);
        E.state.messages.push(...newMessages);
        await E.db.put("chats", chat);
        await E.db.bulkPut("messages", newMessages);
        E.toast(`已导入 ${newMessages.length} 条消息`);
        E.navigate(`#/chat/${chat.id}`);
      } catch (error) {
        E.toast(error.message || "导入失败");
      }
    });
    input.click();
  };

  E.speak = function (text) {
    if (!text || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      // Speech synthesis is optional.
    }
  };
})();
