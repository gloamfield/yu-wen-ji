(function () {
  "use strict";

  const E = window.Ember;

  // ---------- gallery ----------

  E.renderGalleryHTML = function () {
    const rows = E.state.gallery.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return `
      <div class="app-page">
        ${E.appHeaderHTML("相册", {
          subtitle: `${rows.length} 张照片`,
          actions: `<button class="header-btn" data-action="upload-gallery" aria-label="上传照片">${E.icon("plus", 20)}</button>`
        })}
        <div class="app-body">
          ${rows.length ? `<div class="gallery-grid">
            ${rows.map((item) => `
              <button class="gallery-item" data-action="view-gallery" data-id="${E.escapeHTML(item.id)}">
                <img src="${E.escapeHTML(E.safeImage(item.dataUrl))}" alt="${E.escapeHTML(item.title || "照片")}">
                <span class="gallery-del" data-action="delete-gallery" data-id="${E.escapeHTML(item.id)}">${E.icon("close", 12)}</span>
              </button>
            `).join("")}
          </div>` : E.emptyState("gallery", "相册还是空的", "上传一张照片，或者让角色发一张。", `<button class="btn" data-action="upload-gallery">${E.icon("upload", 16)} 上传照片</button>`)}
        </div>
      </div>
    `;
  };

  E.uploadGalleryFlow = function () {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      for (const file of files) {
        const dataUrl = await E.readFileAsDataURL(file);
        const item = {
          id: E.uid("photo"),
          title: file.name || "照片",
          dataUrl,
          createdAt: Date.now()
        };
        E.state.gallery.push(item);
        await E.db.put("gallery", item);
      }
      E.toast(`已添加 ${files.length} 张照片`);
      E.renderRoute();
    });
    input.click();
  };

  E.viewGalleryItem = function (id) {
    const item = E.state.gallery.find((row) => row.id === id);
    if (!item) return;
    E.openSheet({
      title: item.title || "照片",
      body: `
        <img src="${E.escapeHTML(E.safeImage(item.dataUrl))}" alt="${E.escapeHTML(item.title || "照片")}" style="width:100%;border-radius:16px;display:block">
        <div class="hint" style="margin-top:10px">${E.fmtDateTime(item.createdAt)}</div>
        <div class="sheet-actions">
          <button class="btn danger" data-action="delete-gallery" data-id="${E.escapeHTML(item.id)}">${E.icon("trash", 16)} 删除</button>
        </div>
      `
    });
  };

  E.deleteGalleryItem = async function (id) {
    if (!E.confirm("删除这张照片？")) return;
    await E.db.del("gallery", id);
    E.state.gallery = E.state.gallery.filter((item) => item.id !== id);
    E.closeSheet();
    E.renderRoute();
  };

  // ---------- diary ----------

  E.renderDiaryHTML = function () {
    const rows = E.state.diary.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return `
      <div class="app-page">
        ${E.appHeaderHTML("日记", {
          subtitle: "把今天收起来",
          actions: `<button class="header-btn" data-action="add-diary" aria-label="写日记">${E.icon("plus", 20)}</button>`
        })}
        <div class="app-body">
          ${rows.length ? rows.map((entry) => `
            <div class="card diary-card">
              <div class="row-between">
                <div class="diary-date">${E.fmtDateTime(entry.createdAt)} · ${E.escapeHTML(entry.mood || "平静")}</div>
                <button class="icon-btn" data-action="delete-diary" data-id="${E.escapeHTML(entry.id)}" aria-label="删除">${E.icon("trash", 15)}</button>
              </div>
              <div class="diary-title" data-action="edit-diary" data-id="${E.escapeHTML(entry.id)}">${E.escapeHTML(entry.title || "无标题")}</div>
              <div class="diary-text" data-action="edit-diary" data-id="${E.escapeHTML(entry.id)}">${E.escapeHTML(entry.content || "")}</div>
            </div>
          `).join("") : E.emptyState("diary", "还没有日记", "写一点今天的事，哪怕只有一句。", `<button class="btn" data-action="add-diary">${E.icon("edit", 16)} 写日记</button>`)}
        </div>
      </div>
    `;
  };

  E.diaryFormFlow = function (id) {
    const entry = id ? E.state.diary.find((item) => item.id === id) : null;
    E.formSheet({
      title: entry ? "编辑日记" : "写日记",
      fields: [
        { name: "title", label: "标题", value: entry ? entry.title : "", placeholder: "今天的一句话" },
        { name: "content", label: "正文", type: "textarea", required: true, value: entry ? entry.content : "", placeholder: "写点什么……" },
        {
          name: "mood",
          label: "心情",
          type: "select",
          value: entry ? entry.mood : "平静",
          options: ["平静", "开心", "低落", "疲惫", "期待"]
        }
      ],
      submitLabel: entry ? "保存" : "写下",
      onSubmit: async (values) => {
        if (entry) {
          entry.title = values.title.trim();
          entry.content = values.content.trim();
          entry.mood = values.mood;
          await E.db.put("diary", entry);
        } else {
          const item = {
            id: E.uid("diary"),
            title: values.title.trim() || "无标题",
            content: values.content.trim(),
            mood: values.mood,
            createdAt: Date.now()
          };
          E.state.diary.push(item);
          await E.db.put("diary", item);
        }
        E.toast("日记已保存");
        E.renderRoute();
      }
    });
  };

  E.deleteDiary = async function (id) {
    if (!E.confirm("删除这篇日记？")) return;
    await E.db.del("diary", id);
    E.state.diary = E.state.diary.filter((item) => item.id !== id);
    E.renderRoute();
  };

  // ---------- anniversaries ----------

  E.daysUntil = function (dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 0;
    const today = new Date();
    const one = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let target = new Date(today.getFullYear(), date.getMonth(), date.getDate());
    if (target < one) target = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate());
    return Math.round((target - one) / 86400000);
  };

  E.renderAnniversaryHTML = function () {
    const rows = E.state.anniversaries.slice().sort((a, b) => E.daysUntil(a.date) - E.daysUntil(b.date));
    return `
      <div class="app-page">
        ${E.appHeaderHTML("纪念日", {
          subtitle: "值得记住的日子",
          actions: `<button class="header-btn" data-action="add-anniversary" aria-label="添加纪念日">${E.icon("plus", 20)}</button>`
        })}
        <div class="app-body">
          ${rows.length ? rows.map((item) => {
            const days = E.daysUntil(item.date);
            return `
              <div class="card anniversary-card">
                <div class="anniversary-days">
                  <b>${days === 0 ? "今天" : days}</b>
                  <span>${days === 0 ? "就是今天" : "天后"}</span>
                </div>
                <div class="grow">
                  <div class="character-name">${E.escapeHTML(item.title || "纪念日")}</div>
                  <div class="character-desc">${E.escapeHTML(item.date)}${item.note ? ` · ${E.escapeHTML(item.note)}` : ""}</div>
                </div>
                <button class="icon-btn" data-action="delete-anniversary" data-id="${E.escapeHTML(item.id)}" aria-label="删除">${E.icon("trash", 15)}</button>
              </div>
            `;
          }).join("") : E.emptyState("calendar", "还没有纪念日", "记下一个不想忘记的日子。", `<button class="btn" data-action="add-anniversary">${E.icon("plus", 16)} 添加纪念日</button>`)}
        </div>
      </div>
    `;
  };

  E.anniversaryFormFlow = function () {
    E.formSheet({
      title: "添加纪念日",
      fields: [
        { name: "title", label: "名字", required: true, placeholder: "例如：第一次一起看电影" },
        { name: "date", label: "日期", type: "date", required: true, value: E.fmtDateShort() },
        { name: "note", label: "备注", type: "textarea", placeholder: "那一天发生了什么？" }
      ],
      submitLabel: "保存",
      onSubmit: async (values) => {
        const item = {
          id: E.uid("ann"),
          title: values.title.trim(),
          date: values.date,
          note: values.note.trim(),
          createdAt: Date.now()
        };
        E.state.anniversaries.push(item);
        await E.db.put("anniversaries", item);
        E.toast("纪念日已添加");
        E.renderRoute();
      }
    });
  };

  E.deleteAnniversary = async function (id) {
    if (!E.confirm("删除这个纪念日？")) return;
    await E.db.del("anniversaries", id);
    E.state.anniversaries = E.state.anniversaries.filter((item) => item.id !== id);
    E.renderRoute();
  };

  // ---------- wallet ----------

  E.walletBalance = function () {
    return E.state.wallet.reduce((sum, item) => {
      const amount = Number(item.amount) || 0;
      return sum + (item.type === "income" ? amount : -amount);
    }, 0);
  };

  E.renderWalletHTML = function () {
    const rows = E.state.wallet.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    const balance = E.walletBalance();
    return `
      <div class="app-page">
        ${E.appHeaderHTML("钱包", {
          subtitle: "只是记一笔",
          actions: `<button class="header-btn" data-action="add-wallet" aria-label="记一笔">${E.icon("plus", 20)}</button>`
        })}
        <div class="app-body">
          <div class="wallet-hero">
            <div class="wallet-label">当前余额</div>
            <div class="wallet-amount"><small>¥</small> ${balance.toFixed(2)}</div>
            <div class="wallet-sub" style="margin-top:8px;font-size:10.5px;opacity:.64">和角色一起过日子，不是真实支付。</div>
          </div>
          <div class="section-label">流水</div>
          ${rows.length ? `<div class="card" style="padding:2px 14px">
            ${rows.map((item) => `
              <div class="wallet-row">
                <div class="settings-icon" style="background:${item.type === "income" ? "rgba(76,154,117,.12)" : "rgba(201,79,85,.10)"};color:${item.type === "income" ? "var(--green)" : "var(--danger)"}">
                  ${E.icon(item.type === "income" ? "download" : "upload", 16)}
                </div>
                <div class="grow">
                  <div class="settings-label">${E.escapeHTML(item.note || (item.type === "income" ? "收入" : "支出"))}</div>
                  <div class="settings-desc">${E.fmtDateTime(item.createdAt)}</div>
                </div>
                <div class="wallet-amount-row ${item.type === "income" ? "income" : "expense"}">${item.type === "income" ? "+" : "-"}${Number(item.amount || 0).toFixed(2)}</div>
                <button class="icon-btn" data-action="delete-wallet" data-id="${E.escapeHTML(item.id)}" aria-label="删除">${E.icon("close", 14)}</button>
              </div>
            `).join("")}
          </div>` : E.emptyState("wallet", "还没有流水", "记一笔收入或支出。")}
        </div>
      </div>
    `;
  };

  E.walletFormFlow = function () {
    E.formSheet({
      title: "记一笔",
      fields: [
        { name: "type", label: "类型", type: "select", options: [{ value: "expense", label: "支出" }, { value: "income", label: "收入" }] },
        { name: "amount", label: "金额", type: "number", required: true, value: "0.00" },
        { name: "note", label: "备注", placeholder: "咖啡、稿费、礼物……" }
      ],
      submitLabel: "保存",
      onSubmit: async (values) => {
        const item = {
          id: E.uid("wal"),
          type: values.type,
          amount: Math.max(0, Number(values.amount) || 0),
          note: values.note.trim(),
          createdAt: Date.now()
        };
        E.state.wallet.push(item);
        await E.db.put("wallet", item);
        E.toast("已记一笔");
        E.renderRoute();
      }
    });
  };

  E.deleteWallet = async function (id) {
    if (!E.confirm("删除这条流水？")) return;
    await E.db.del("wallet", id);
    E.state.wallet = E.state.wallet.filter((item) => item.id !== id);
    E.renderRoute();
  };

  // ---------- music ----------

  E.renderMusicHTML = function () {
    const rows = E.state.music.slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    const current = E.state.playingMusicId ? E.state.music.find((item) => item.id === E.state.playingMusicId) : null;
    return `
      <div class="app-page">
        ${E.appHeaderHTML("音乐", {
          subtitle: current ? `正在播放 · ${current.title}` : "给这台手机一点声音",
          actions: `<button class="header-btn" data-action="add-music" aria-label="添加音乐">${E.icon("plus", 20)}</button>`
        })}
        <div class="app-body" style="padding-bottom:${current ? "92px" : "26px"}">
          ${rows.length ? `<div class="card" style="padding:4px 14px">
            ${rows.map((track) => {
              const isCurrent = E.state.playingMusicId === track.id;
              return `
                <div class="track-row">
                  <div class="track-cover">${E.icon(isCurrent && !E.state.musicPaused ? "pause" : "play", 21)}</div>
                  <div class="grow">
                    <div class="track-title">${E.escapeHTML(track.title || "未命名")}</div>
                    <div class="track-artist">${E.escapeHTML(track.artist || "未知")}${track.url ? "" : " · 没有音频地址"}</div>
                  </div>
                  <button class="icon-btn" data-action="play-music" data-id="${E.escapeHTML(track.id)}" aria-label="播放">${E.icon(isCurrent && !E.state.musicPaused ? "pause" : "play", 18)}</button>
                  <button class="icon-btn" data-action="delete-music" data-id="${E.escapeHTML(track.id)}" aria-label="删除">${E.icon("trash", 15)}</button>
                </div>
              `;
            }).join("")}
          </div>` : E.emptyState("music", "还没有音乐", "添加一个音频地址，或者从本地选一首歌。", `<button class="btn" data-action="add-music">${E.icon("plus", 16)} 添加音乐</button>`)}
        </div>
        ${current ? `<div class="now-playing">
          <div class="track-cover" style="width:38px;height:38px">${E.icon("music", 18)}</div>
          <div class="grow"><div class="track-title">${E.escapeHTML(current.title)}</div><div class="track-artist">${E.escapeHTML(current.artist || "未知")}</div></div>
          <button class="icon-btn" data-action="play-music" data-id="${E.escapeHTML(current.id)}">${E.icon(E.state.musicPaused ? "play" : "pause", 19)}</button>
        </div>` : ""}
      </div>
    `;
  };

  E.addMusicFlow = function () {
    E.formSheet({
      title: "添加音乐",
      fields: [
        { name: "title", label: "歌名", required: true, placeholder: "例如：夜间飞行" },
        { name: "artist", label: "歌手", placeholder: "未知" },
        { name: "url", label: "音频地址", placeholder: "https://... 或留空并选择文件" },
        { name: "file", label: "本地音频（可选）", type: "file", accept: "audio/*", readAsDataUrl: true }
      ],
      submitLabel: "添加",
      onSubmit: async (values) => {
        const url = values.fileDataUrl || values.url.trim();
        if (!url) throw new Error("请填写音频地址或选择文件");
        const item = {
          id: E.uid("track"),
          title: values.title.trim(),
          artist: values.artist.trim() || "未知",
          url,
          createdAt: Date.now()
        };
        E.state.music.push(item);
        await E.db.put("music", item);
        E.toast("已添加");
        E.renderRoute();
      }
    });
  };

  E.playMusic = async function (id) {
    const track = E.state.music.find((item) => item.id === id);
    if (!track) return;
    if (E.state.musicAudio && E.state.playingMusicId === id) {
      if (E.state.musicAudio.paused) {
        await E.state.musicAudio.play();
        E.state.musicPaused = false;
      } else {
        E.state.musicAudio.pause();
        E.state.musicPaused = true;
      }
      E.renderRoute();
      return;
    }
    if (E.state.musicAudio) {
      E.state.musicAudio.pause();
      E.state.musicAudio = null;
    }
    try {
      const audio = new Audio(track.url);
      audio.preload = "auto";
      audio.addEventListener("ended", () => {
        E.state.musicPaused = true;
        E.renderRoute();
      });
      E.state.musicAudio = audio;
      E.state.playingMusicId = id;
      E.state.musicPaused = false;
      await audio.play();
      E.renderRoute();
    } catch (error) {
      E.toast("播放失败，可能是音频地址不可用或浏览器阻止了自动播放");
    }
  };

  E.deleteMusic = async function (id) {
    if (!E.confirm("删除这首音乐？")) return;
    if (E.state.playingMusicId === id && E.state.musicAudio) {
      E.state.musicAudio.pause();
      E.state.musicAudio = null;
      E.state.playingMusicId = null;
      E.state.musicPaused = false;
    }
    await E.db.del("music", id);
    E.state.music = E.state.music.filter((item) => item.id !== id);
    E.renderRoute();
  };
})();
