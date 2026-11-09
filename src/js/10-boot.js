(function () {
  "use strict";

  const E = window.Ember;

  async function handleAction(action, el) {
    const id = el.dataset.id || "";
    const route = E.parseRoute();
    switch (action) {
      case "unlock":
        E.unlock();
        break;
      case "notifications":
        E.toggleNotifications();
        break;
      case "close-notifications":
        E.state.notificationOpen = false;
        E.renderNotificationDrawer();
        break;
      case "open-notification":
        await E.openNotification(id);
        break;
      case "back":
        if (route.name === "home") E.lock();
        else if (window.history.length > 1) window.history.back();
        else E.navigate("#/home");
        break;
      case "add-character":
        E.addCharacterFlow();
        break;
      case "import-character":
        E.importCharacterFlow();
        break;
      case "edit-character":
        E.editCharacterFlow(id);
        break;
      case "character-menu":
        E.characterMenuFlow(id);
        break;
      case "export-character": {
        const character = E.getCharacter(id);
        if (character) {
          E.exportCharacter(character);
          E.closeSheet();
        }
        break;
      }
      case "delete-character":
        await E.deleteCharacterFlow(id);
        break;
      case "character-tab":
        E.state.characterTab = el.dataset.tab || "persona";
        E.renderRoute();
        break;
      case "add-worldbook":
        E.addWorldbookFlow(id);
        break;
      case "delete-worldbook":
        await E.deleteWorldbook(id, el.dataset.entry);
        break;
      case "add-memory":
        E.addMemoryFlow(id);
        break;
      case "delete-memory":
        await E.deleteMemory(id);
        break;
      case "toggle-memory-pin":
        await E.toggleMemoryPin(id);
        break;
      case "start-chat":
        await E.startChatWithCharacter(id);
        break;
      case "new-chat":
        E.newChatFlow();
        break;
      case "import-chat":
        E.importChatFlow();
        break;
      case "send-message":
        await E.sendChatMessage(route.args[0]);
        break;
      case "stop-generation":
        E.stopGeneration();
        break;
      case "chat-menu":
        E.chatMenuFlow(id);
        break;
      case "extract-memory":
        await E.manualExtractMemories(id);
        break;
      case "open-memory-library":
        E.closeSheet();
        E.navigate("#/memory");
        break;
      case "regenerate":
        E.closeSheet();
        await E.regenerateLast(id);
        break;
      case "export-chat":
        E.exportChat(id);
        break;
      case "clear-chat":
        await E.clearChat(id);
        break;
      case "delete-chat":
        await E.deleteChat(id);
        break;
      case "compose-moment":
        E.composeMomentFlow();
        break;
      case "ai-moment":
        await E.aiMomentFlow();
        break;
      case "like-moment":
        await E.likeMoment(id);
        break;
      case "comment-moment":
        E.commentMomentFlow(id);
        break;
      case "delete-moment":
        await E.deleteMomentFlow(id);
        break;
      case "view-moment-image":
        E.viewMomentImage(el.dataset.src);
        break;
      case "new-call":
        E.newCallFlow();
        break;
      case "call-character":
        E.startCall(id);
        break;
      case "hangup-call":
        await E.hangupCall();
        break;
      case "speaker-call":
        E.toast("免提已打开（示意）");
        break;
      case "new-forum":
        E.newForumFlow();
        break;
      case "reply-forum":
        E.replyForumFlow(id);
        break;
      case "delete-forum":
        await E.deleteForumFlow(id);
        break;
      case "upload-gallery":
        E.uploadGalleryFlow();
        break;
      case "view-gallery":
        E.viewGalleryItem(id);
        break;
      case "delete-gallery":
        await E.deleteGalleryItem(id);
        break;
      case "add-diary":
        E.diaryFormFlow();
        break;
      case "edit-diary":
        E.diaryFormFlow(id);
        break;
      case "delete-diary":
        await E.deleteDiary(id);
        break;
      case "add-anniversary":
        E.anniversaryFormFlow();
        break;
      case "delete-anniversary":
        await E.deleteAnniversary(id);
        break;
      case "add-wallet":
        E.walletFormFlow();
        break;
      case "delete-wallet":
        await E.deleteWallet(id);
        break;
      case "add-music":
        E.addMusicFlow();
        break;
      case "play-music":
        await E.playMusic(id);
        break;
      case "delete-music":
        await E.deleteMusic(id);
        break;
      case "save-settings":
        await E.saveSettingsFromFields();
        break;
      case "theme-pack":
        await E.setThemePack(id);
        break;
      case "test-provider":
        await E.testProviderFromFields();
        break;
      case "export-backup":
        await E.exportBackup();
        break;
      case "import-backup":
        E.importBackupFlow();
        break;
      case "export-characters":
        E.exportAllCharacters();
        break;
      case "clear-data":
        await E.clearAllDataFlow();
        break;
      case "about":
        E.showAbout();
        break;
      case "lock-screen":
        E.closeSheet();
        E.lock();
        break;
      case "life-recap":
        E.showLifeRecap();
        break;
      case "life-recap-open":
        E.openLifeEvent(el.dataset.route || "");
        break;
      case "life-tick-now":
        await E.lifeEngine.simulateAway(3);
        E.closeSheet();
        if (E.parseRoute().name === "settings") E.renderRoute();
        break;
      default:
        break;
    }
  }

  function bindGlobalEvents() {
    document.addEventListener("click", async (event) => {
      const actionEl = event.target.closest("[data-action]");
      if (actionEl) {
        event.preventDefault();
        event.stopPropagation();
        try {
          await handleAction(actionEl.dataset.action, actionEl);
        } catch (error) {
          E.toast(error && error.message ? error.message : "操作失败", 4200);
        }
        return;
      }
      const routeEl = event.target.closest("[data-route]");
      if (routeEl) {
        event.preventDefault();
        E.navigate(routeEl.dataset.route);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.target && event.target.id === "chat-input") {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          const route = E.parseRoute();
          if (route.name === "chat" && route.args[0]) E.sendChatMessage(route.args[0]);
        }
      }
    });

    document.addEventListener("input", (event) => {
      if (event.target && event.target.id === "chat-input") {
        event.target.style.height = "auto";
        event.target.style.height = `${Math.min(110, event.target.scrollHeight)}px`;
      }
    });

    document.addEventListener("change", async (event) => {
      if (event.target && event.target.id === "settings-provider") {
        try {
          await E.changeProvider(event.target.value);
        } catch (error) {
          E.toast(error.message || "切换服务商失败");
        }
      }
    });

    window.addEventListener("hashchange", () => {
      if (!E.state.locked) E.renderRoute();
    });

    const lock = document.getElementById("lock-screen");
    if (lock) {
      lock.addEventListener("click", (event) => {
        if (event.target.closest("[data-action]")) return;
        E.unlock();
      });
    }

    document.addEventListener("visibilitychange", () => {
      if (!E.lifeEngine) return;
      if (document.hidden) {
        void E.lifeEngine.onHidden();
      } else {
        void E.lifeEngine.onVisible();
      }
    });

    window.addEventListener("beforeunload", () => {
      if (E.lifeEngine) void E.lifeEngine.onHidden();
    });
  }

  async function init() {
    if (!location.hash) location.hash = "#/home";
    try {
      await E.loadState();
    } catch (error) {
      E.toast("数据加载失败，已进入临时模式");
      console.error(error);
    }
    try {
      await E.lifeEngine.onBoot();
    } catch (error) {
      console.warn("生活事件结算失败", error);
    }
    E.state.locked = true;
    E.renderShell();
    bindGlobalEvents();
    setInterval(E.updateClock, 30000);
    setTimeout(() => {
      if (E.state.locked) {
        const hint = document.querySelector(".unlock-hint");
        if (hint) hint.textContent = "上滑或点击进入";
      }
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
