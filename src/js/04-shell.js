(function () {
  "use strict";

  const E = window.Ember;

  E.APPS = [
    { id: "chat", label: "聊天", icon: "chat", route: "#/chat", color: "linear-gradient(135deg,#5b8def,#7a6ff0)" },
    { id: "contacts", label: "角色", icon: "contacts", route: "#/contacts", color: "linear-gradient(135deg,#c87f8a,#9b6f8f)" },
    { id: "moments", label: "动态", icon: "moments", route: "#/moments", color: "linear-gradient(135deg,#e39a8a,#c86b83)" },
    { id: "calls", label: "电话", icon: "phone", route: "#/calls", color: "linear-gradient(135deg,#4c9a75,#3e7e6a)" },
    { id: "gallery", label: "相册", icon: "gallery", route: "#/gallery", color: "linear-gradient(135deg,#d1a05a,#b47b48)" },
    { id: "diary", label: "日记", icon: "diary", route: "#/diary", color: "linear-gradient(135deg,#8b83b8,#6f6799)" },
    { id: "anniversary", label: "纪念日", icon: "calendar", route: "#/anniversary", color: "linear-gradient(135deg,#d77b86,#b35c72)" },
    { id: "wallet", label: "钱包", icon: "wallet", route: "#/wallet", color: "linear-gradient(135deg,#5e9a88,#3f7c70)" },
    { id: "music", label: "音乐", icon: "music", route: "#/music", color: "linear-gradient(135deg,#c86b83,#8f5d9e)" },
    { id: "forum", label: "论坛", icon: "forum", route: "#/forum", color: "linear-gradient(135deg,#6d8fb8,#536b9a)" },
    { id: "herphone", label: "她的手机", icon: "device", route: "#/her-phone", color: "linear-gradient(135deg,#b57b8d,#7d5d83)" },
    { id: "memory", label: "记忆", icon: "memory", route: "#/memory", color: "linear-gradient(135deg,#9b8cb8,#6f668f)" },
    { id: "settings", label: "设置", icon: "settings", route: "#/settings", color: "linear-gradient(135deg,#8d8588,#5f595c)" }
  ];

  E.DOCK_APPS = ["chat", "contacts", "moments", "settings"];

  E.getApp = function (id) {
    return E.APPS.find((app) => app.id === id);
  };

  E.renderStatus = function () {
    const time = document.getElementById("status-time");
    if (time) time.textContent = E.fmtClock();
    const bell = document.getElementById("status-bell");
    if (bell && !bell.dataset.ready) {
      bell.innerHTML = E.icon("bell", 15);
      bell.dataset.ready = "1";
    }
    const badge = document.getElementById("status-badge");
    if (badge) {
      const count = E.state.notifications.filter((item) => !item.read).length;
      badge.hidden = count <= 0;
      badge.textContent = count > 99 ? "99+" : String(count);
    }
  };

  E.renderShell = function () {
    document.body.dataset.locked = String(!!E.state.locked);
    E.applyTheme();
    E.renderStatus();
    E.renderLockScreen();
    E.renderScreen();
    E.renderNotificationDrawer();
  };

  E.renderLockScreen = function () {
    const el = document.getElementById("lock-screen");
    if (!el) return;
    if (!E.state.locked) {
      el.classList.add("unlocked");
      return;
    }
    const notifications = E.state.notifications.slice(0, 3);
    const lifeSummary = E.lifeEngine ? E.lifeEngine.homeSummary() : null;
    const lifeCard = lifeSummary
      ? `
        <div class="life-lock-card" data-action="life-recap">
          <div class="life-lock-kicker">你不在的时候</div>
          <div class="life-lock-text">${E.escapeHTML(lifeSummary.text)}</div>
          <div class="life-lock-sub">${E.escapeHTML(lifeSummary.sub || "")}</div>
        </div>
      `
      : "";
    const notifHTML = notifications.length
      ? notifications.map((item) => {
        const appIcon = item.app === "moments" ? "moments" : item.app === "diary" ? "diary" : item.app === "calls" ? "phone" : "chat";
        const themedIcon = E.themeIconFor(appIcon);
        const iconHTML = themedIcon
          ? `<img class="lock-notif-img" src="${E.escapeHTML(themedIcon)}" alt="">`
          : E.icon(appIcon, 17);
        return `
          <div class="lock-notif" data-action="open-notification" data-id="${E.escapeHTML(item.id)}">
            <div class="lock-notif-icon ${themedIcon ? "themed" : ""}">${iconHTML}</div>
            <div class="lock-notif-body">
              <div class="lock-notif-title"><span>${E.escapeHTML(item.title || "通知")}</span><time>${E.fmtRelative(item.createdAt)}</time></div>
              <div class="lock-notif-text">${E.escapeHTML(item.body || "")}</div>
            </div>
          </div>
        `;
      }).join("")
      : `<div class="lock-notif"><div class="lock-notif-icon">${E.icon("sparkles", 17)}</div><div class="lock-notif-body"><div class="lock-notif-title"><span>余温机</span><time>现在</time></div><div class="lock-notif-text">今天也有人在等你打开手机。</div></div></div>`;

    el.classList.remove("unlocked");
    el.innerHTML = `
      <div class="lock-time" id="lock-time">${E.fmtClock()}</div>
      <div class="lock-date">${E.fmtDate()}</div>
      <div class="lock-notifs">${lifeCard}${notifHTML}</div>
      <div class="unlock-wrap">
        <button class="unlock-btn" data-action="unlock" aria-label="解锁">${E.icon("arrowRight", 22)}</button>
        <div class="unlock-hint">上滑或点击进入</div>
      </div>
    `;
  };

  E.renderScreen = function () {
    const screen = document.getElementById("screen");
    if (!screen) return;
    if (E.state.locked) {
      screen.innerHTML = E.renderHomeHTML();
      E.bindHomeEvents();
      return;
    }
    E.renderRoute();
  };

  E.unlock = function () {
    if (!E.state.locked) return;
    E.state.locked = false;
    document.body.dataset.locked = "false";
    const lock = document.getElementById("lock-screen");
    if (lock) lock.classList.add("unlocked");
    E.renderScreen();
    setTimeout(() => {
      if (lock && !E.state.locked) lock.style.display = "none";
    }, 520);
  };

  E.lock = function () {
    E.state.locked = true;
    document.body.dataset.locked = "true";
    const lock = document.getElementById("lock-screen");
    if (lock) {
      lock.style.display = "";
      lock.classList.remove("unlocked");
    }
    E.renderLockScreen();
    E.renderScreen();
  };

  E.homeGreeting = function () {
    const hour = new Date().getHours();
    if (hour < 6) return "还没睡？";
    if (hour < 11) return "早上好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    if (hour < 23) return "晚上好";
    return "夜深了";
  };

  E.appTileHTML = function (app, inDock) {
    let badge = 0;
    if (app.id === "chat") badge = E.unreadTotal();
    if (app.id === "calls") badge = E.missedCalls();
    const badgeHTML = badge > 0 ? `<span class="app-badge">${badge > 99 ? "99+" : badge}</span>` : "";
    const themedIcon = E.themeIconFor(app.icon);
    const iconHTML = themedIcon
      ? `<img class="app-icon-img" src="${E.escapeHTML(themedIcon)}" alt="">`
      : E.icon(app.icon, 27);
    return `
      <button class="app-tile" data-route="${app.route}" aria-label="${E.escapeHTML(app.label)}">
        <span class="app-icon ${themedIcon ? "themed" : ""}" style="${themedIcon ? "" : `background:${app.color}`}">
          ${iconHTML}
          ${badgeHTML}
        </span>
        ${inDock ? "" : `<span class="app-label">${E.escapeHTML(app.label)}</span>`}
      </button>
    `;
  };

  E.renderHomeHTML = function () {
    const lifeSummary = E.lifeEngine ? E.lifeEngine.homeSummary() : null;
    const latestMoment = [...E.state.moments].sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
    const momentCharacter = latestMoment ? E.getCharacter(latestMoment.characterId) : null;
    const latestMessage = [...E.state.messages].sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
    const messageChat = latestMessage ? E.getChat(latestMessage.chatId) : null;
    const widgetText = lifeSummary
      ? lifeSummary.text
      : latestMoment && momentCharacter
      ? `${momentCharacter.name} 刚刚发了一条动态。`
      : latestMessage && messageChat
        ? `${E.chatTitle(messageChat)}：${latestMessage.content.slice(0, 30)}`
        : "这里还很安静。去和某个人说句话吧。";
    const widgetSub = lifeSummary
      ? lifeSummary.sub
      : latestMoment && momentCharacter
      ? latestMoment.content.split("\n")[0].slice(0, 40)
      : "角色离线时，也会继续生活。";
    const dockApps = E.DOCK_APPS.map((id) => E.getApp(id)).filter(Boolean);
    return `
      <div class="home">
        <div class="home-kicker">余温机 · ${E.escapeHTML(E.state.settings.userName || "我")}</div>
        <div class="home-title">${E.homeGreeting()}</div>
        <div class="home-subtitle">${E.fmtDate()} · 今天也有一点余温</div>
        <div class="home-widget ${lifeSummary ? "life-widget" : ""}" ${lifeSummary ? 'data-action="life-recap"' : ""}>
          <div class="widget-top">
            <span class="widget-label">此刻</span>
            <span class="widget-dot"></span>
          </div>
          <div class="widget-text">${E.escapeHTML(widgetText)}</div>
          <div class="widget-sub">${E.escapeHTML(widgetSub)}</div>
        </div>
        <div class="app-grid">
          ${E.APPS.map((app) => E.appTileHTML(app, false)).join("")}
        </div>
      </div>
      <div class="dock">
        ${dockApps.map((app) => E.appTileHTML(app, true)).join("")}
      </div>
    `;
  };

  E.bindHomeEvents = function () {
    // Click handling is delegated globally; this hook exists for future gestures.
  };

  E.appHeaderHTML = function (title, options) {
    const opts = options || {};
    const back = opts.back === false ? `<span class="header-spacer"></span>` : `<button class="header-btn" data-action="back" aria-label="返回">${E.icon("back", 21)}</button>`;
    const subtitle = opts.subtitle ? `<small>${E.escapeHTML(opts.subtitle)}</small>` : "";
    return `
      <div class="app-header">
        ${back}
        <div class="app-title">${E.escapeHTML(title)}${subtitle}</div>
        <div class="row" style="gap:0">${opts.actions || `<span class="header-spacer"></span>`}</div>
      </div>
    `;
  };

  E.emptyState = function (icon, title, text, actionHTML) {
    return `
      <div class="empty">
        <div class="empty-icon">${E.icon(icon || "sparkles", 24)}</div>
        <div class="empty-title">${E.escapeHTML(title || "还没有内容")}</div>
        <div class="empty-text">${E.escapeHTML(text || "")}</div>
        ${actionHTML ? `<div style="margin-top:14px">${actionHTML}</div>` : ""}
      </div>
    `;
  };

  E.navigate = function (route) {
    const target = route || "#/home";
    if (E.state.locked) E.unlock();
    if (location.hash === target) {
      E.renderRoute();
    } else {
      location.hash = target;
    }
  };

  E.parseRoute = function () {
    const raw = (location.hash || "#/home").replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    return { name: parts[0] || "home", args: parts.slice(1) };
  };

  E.renderRoute = function () {
    const screen = document.getElementById("screen");
    if (!screen || E.state.locked) return;
    const route = E.parseRoute();
    E.state.route = location.hash || "#/home";
    let html = "";
    switch (route.name) {
      case "home":
        html = E.renderHomeHTML();
        break;
      case "chat":
        html = route.args[0] ? E.renderChatThreadHTML(route.args[0]) : E.renderChatListHTML();
        break;
      case "contacts":
        html = E.renderContactsHTML();
        break;
      case "character":
        html = E.renderCharacterDetailHTML(route.args[0]);
        break;
      case "moments":
        html = E.renderMomentsHTML();
        break;
      case "calls":
        html = E.renderCallsHTML();
        break;
      case "gallery":
        html = E.renderGalleryHTML();
        break;
      case "diary":
        html = E.renderDiaryHTML();
        break;
      case "anniversary":
        html = E.renderAnniversaryHTML();
        break;
      case "wallet":
        html = E.renderWalletHTML();
        break;
      case "music":
        html = E.renderMusicHTML();
        break;
      case "forum":
        html = route.args[0] ? E.renderForumThreadHTML(route.args[0]) : E.renderForumHTML();
        break;
      case "her-phone":
        html = E.renderHerPhoneHTML(route.args[0]);
        break;
      case "memory":
        html = E.renderMemoryLibraryHTML();
        break;
      case "settings":
        html = E.renderSettingsHTML();
        break;
      default:
        html = E.renderHomeHTML();
        break;
    }
    screen.innerHTML = html;
    E.renderStatus();
    E.renderNotificationDrawer();
    if (route.name === "chat" && route.args[0]) {
      const thread = document.querySelector(".thread");
      if (thread) thread.scrollTop = thread.scrollHeight;
    }
    if (route.name === "music" && E.state.playingMusicId) {
      E.renderNowPlayingBar();
    }
  };

  E.renderNotificationDrawer = function () {
    const el = document.getElementById("notification-drawer");
    if (!el) return;
    if (!E.state.notificationOpen) {
      el.classList.remove("open");
      el.innerHTML = "";
      return;
    }
    const items = E.state.notifications.slice(0, 20);
    el.classList.add("open");
    el.innerHTML = `
      <div class="notif-panel">
        <div class="notif-head">
          <h3>通知</h3>
          <button class="icon-btn" data-action="close-notifications" aria-label="关闭">${E.icon("close", 17)}</button>
        </div>
        ${items.length ? items.map((item) => {
          const appIcon = item.app === "moments" ? "moments" : item.app === "diary" ? "diary" : item.app === "calls" ? "phone" : "chat";
          return `
          <div class="notif-item" data-action="open-notification" data-id="${E.escapeHTML(item.id)}">
            <span class="avatar sm">${E.icon(appIcon, 15)}</span>
            <div class="grow">
              <div class="notif-title">${E.escapeHTML(item.title || "通知")}</div>
              <div class="notif-body">${E.escapeHTML(item.body || "")}</div>
            </div>
          </div>
        `;
        }).join("") : `<div class="empty"><div class="empty-title">没有新通知</div><div class="empty-text">这里会收起来自聊天和动态的消息。</div></div>`}
      </div>
    `;
  };

  E.toggleNotifications = function () {
    E.state.notificationOpen = !E.state.notificationOpen;
    E.renderNotificationDrawer();
  };

  E.openNotification = async function (id) {
    const item = E.state.notifications.find((n) => n.id === id);
    if (!item) return;
    item.read = true;
    await E.saveNotifications();
    E.state.notificationOpen = false;
    E.renderNotificationDrawer();
    E.renderStatus();
    if (item.route) E.navigate(item.route);
  };

  E.updateClock = function () {
    const time = document.getElementById("status-time");
    if (time) time.textContent = E.fmtClock();
    const lockTime = document.getElementById("lock-time");
    if (lockTime) lockTime.textContent = E.fmtClock();
  };
})();
