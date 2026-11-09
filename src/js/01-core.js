(function () {
  "use strict";

  const E = window.Ember = window.Ember || {};

  E.APP_NAME = "余温机";
  E.VERSION = "0.9.0";
  E.STORES = [
    "characters",
    "chats",
    "messages",
    "moments",
    "calls",
    "gallery",
    "diary",
    "anniversaries",
    "wallet",
    "music",
    "forum",
    "memories",
    "meta"
  ];

  E.escapeHTML = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  E.uid = function (prefix) {
    const rand = Math.random().toString(36).slice(2, 9);
    return `${prefix || "id"}_${Date.now().toString(36)}_${rand}`;
  };

  E.clamp = function (value, min, max) {
    return Math.min(max, Math.max(min, value));
  };

  E.sleep = function (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  E.debounce = function (fn, wait) {
    let timer = 0;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  E.fmtClock = function (date) {
    const d = date ? new Date(date) : new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  E.fmtDate = function (date) {
    const d = date ? new Date(date) : new Date();
    const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日 星期${week}`;
  };

  E.fmtDateShort = function (date) {
    const d = date ? new Date(date) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  E.fmtDateTime = function (date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return `${E.fmtDateShort(d)} ${E.fmtClock(d)}`;
  };

  E.fmtRelative = function (date) {
    const d = new Date(date).getTime();
    if (!Number.isFinite(d)) return "";
    const diff = Date.now() - d;
    if (diff < 60 * 1000) return "刚刚";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)} 天前`;
    return E.fmtDateShort(d);
  };

  E.fmtDay = function (date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const today = new Date();
    const one = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const two = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((two - one) / 86400000);
    if (diff === 0) return "今天";
    if (diff === 1) return "明天";
    if (diff === -1) return "昨天";
    return diff > 0 ? `${diff} 天后` : `${Math.abs(diff)} 天前`;
  };

  const ICONS = {
    home: '<path d="M3 10.8 12 3l9 7.8"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    chat: '<path d="M20.5 11.5a8.2 8.2 0 0 1-8.2 8.2 9 9 0 0 1-3.2-.6L4 21l1.8-4.8a8.2 8.2 0 1 1 14.7-4.7Z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
    contacts: '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 20c.7-3.4 3-5.3 6.2-5.3s5.5 1.9 6.2 5.3"/><path d="M16.5 5.5a3 3 0 0 1 0 5.6M18.2 14.8c2 .7 3.3 2.4 3.7 4.6"/>',
    moments: '<rect x="3" y="4" width="18" height="16" rx="4"/><circle cx="8" cy="9" r="1.5"/><path d="m4.5 17 5.2-5.2 3.3 3.3 2.2-2.2 4.3 4.1"/>',
    phone: '<path d="M7.2 3.8 9.7 4c.5.1.8.5.9 1l.7 3.1c.1.4 0 .8-.4 1.1l-1.6 1.2a14 14 0 0 0 5.3 5.3l1.2-1.6c.3-.4.7-.5 1.1-.4l3.1.7c.5.1.9.4 1 1l.2 2.5c.1 1.1-.8 2-1.9 2A16.2 16.2 0 0 1 4.8 5.7c0-1.1.9-2 2-1.9Z"/>',
    gallery: '<rect x="3" y="4" width="18" height="16" rx="4"/><circle cx="8.5" cy="9" r="1.7"/><path d="m4 18 5.5-5.4 3.3 3.3 2.5-2.5L20 18"/>',
    diary: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 0 5 22V4.5Z"/><path d="M5 18.2A2.5 2.5 0 0 1 7.5 16H20"/><path d="M9 6h7M9 9.5h5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
    wallet: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v11.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-11Z"/><path d="M3 8h18"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z"/>',
    music: '<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',
    forum: '<path d="M4 5.5h16v10H8l-4 3v-13Z"/><path d="M8 9h8M8 12h5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.7 2.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3.8v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.6 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-3.8h.4a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.6 7 7.3 4.3l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h3.8v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3.8H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    back: '<path d="m14.5 5-7 7 7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="m21 3-7.2 18-3.1-7.7L3 10.2 21 3Z"/><path d="m10.7 13.3 4.6-4.6"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    heart: '<path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z"/>',
    comment: '<path d="M20.5 11.5a8.2 8.2 0 0 1-8.2 8.2 9 9 0 0 1-3.2-.6L4 21l1.8-4.8a8.2 8.2 0 1 1 14.7-4.7Z"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    edit: '<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6"/>',
    group: '<circle cx="9" cy="8" r="3"/><path d="M3 19c.6-3 2.8-4.7 6-4.7s5.4 1.7 6 4.7"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.8c2.6.2 4.3 1.7 4.8 4.2"/>',
    memory: '<path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 5.2A3 3 0 0 0 6 18a3 3 0 0 0 5 2.2V4.8A3 3 0 0 0 9 4Z"/><path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 5.2A3 3 0 0 1 18 18a3 3 0 0 1-5 2.2V4.8A3 3 0 0 1 15 4Z"/>',
    pin: '<path d="m9 4 6 0-1 5 3 3v2h-5v6l-1 2-1-2v-6H4v-2l3-3-1-5Z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M4 18.2A2.5 2.5 0 0 1 6.5 16H20"/><path d="M8 7h8M8 10.5h6"/>',
    sparkles: '<path d="m12 3 1.3 4.7L18 9l-4.7 1.3L12 15l-1.3-4.7L6 9l4.7-1.3L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z"/><path d="m5 14 .7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7L5 14Z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="4"/><circle cx="8.5" cy="9" r="1.7"/><path d="m4 18 5.5-5.4 3.3 3.3 2.5-2.5L20 18"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrowRight: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.8-4L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.8 4L21 15"/><path d="M21 20v-5h-5"/>',
    shield: '<path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.3 2.3 4.7-4.7"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 1.6-3.2 2 2 0 0 1 1.6-3.2H19a2 2 0 0 0 2-2A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14" cy="7" r="1"/><circle cx="17" cy="10" r="1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    speaker: '<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11"/>',
    phoneOff: '<path d="M7.2 3.8 9.7 4c.5.1.8.5.9 1l.7 3.1c.1.4 0 .8-.4 1.1l-1.6 1.2a14 14 0 0 0 5.3 5.3l1.2-1.6c.3-.4.7-.5 1.1-.4l3.1.7c.5.1.9.4 1 1l.2 2.5c.1 1.1-.8 2-1.9 2A16.2 16.2 0 0 1 4.8 5.7c0-1.1.9-2 2-1.9Z"/><path d="m3 3 18 18"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"/><circle cx="12" cy="13" r="3.2"/>',
    device: '<rect x="7" y="2.5" width="10" height="19" rx="3"/><path d="M10 5h4M11 18.5h2"/>',
    memo: '<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 11.5h8M8 15h5"/>',
    history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    cart: '<path d="M3 4h2l2.2 10.5h10.9L21 7H6"/><circle cx="9" cy="19" r="1.4"/><circle cx="18" cy="19" r="1.4"/>',
    wave: '<path d="M4 12h2M8 8v8M12 5v14M16 8v8M20 12h-2"/>',
    draft: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h4M8 12h8M8 15.5h6"/>'
  };

  E.icon = function (name, size) {
    const path = ICONS[name] || ICONS.info;
    return `<svg viewBox="0 0 24 24" width="${size || 22}" height="${size || 22}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  };

  E.avatar = function (character, sizeClass) {
    const c = character || {};
    const name = String(c.name || "?").trim();
    const initial = name ? name.slice(0, 1) : "?";
    const color = c.color || "#c87f8a";
    const cls = ["avatar", sizeClass || ""].filter(Boolean).join(" ");
    const avatar = c.avatar || (typeof E.themeAvatarFor === "function" ? E.themeAvatarFor(c) : "");
    if (avatar) {
      return `<span class="${cls}" style="background:${E.escapeHTML(color)}"><img src="${E.escapeHTML(avatar)}" alt="${E.escapeHTML(name)}"></span>`;
    }
    return `<span class="${cls}" style="background:linear-gradient(135deg, ${E.escapeHTML(color)}, #8b6f8f)">${E.escapeHTML(initial)}</span>`;
  };

  E.safeImage = function (value) {
    const src = String(value || "");
    if (/^data:image\//i.test(src) || /^https?:\/\//i.test(src) || /^blob:/i.test(src)) {
      return src;
    }
    return "";
  };

  E.toast = function (message, ms) {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      el.style.transition = "opacity .2s ease, transform .2s ease";
      setTimeout(() => el.remove(), 220);
    }, ms || 2200);
  };

  E.confirm = function (message) {
    return window.confirm(message);
  };

  E.openSheet = function (options) {
    const root = document.getElementById("modal-root");
    if (!root) return null;
    const opts = options || {};
    const wrap = document.createElement("div");
    wrap.className = "sheet-backdrop";
    wrap.innerHTML = `
      <div class="sheet ${opts.className || ""}" role="dialog" aria-modal="true">
        <div class="sheet-grip"></div>
        <div class="sheet-head">
          <div class="sheet-title">${E.escapeHTML(opts.title || "")}</div>
          <button class="sheet-close" type="button" data-sheet-close aria-label="关闭">${E.icon("close", 16)}</button>
        </div>
        <div class="sheet-body">${opts.body || ""}</div>
      </div>
    `;
    const close = () => {
      wrap.remove();
      if (typeof opts.onClose === "function") opts.onClose();
    };
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap || event.target.closest("[data-sheet-close]")) close();
    });
    root.appendChild(wrap);
    if (typeof opts.onMount === "function") opts.onMount(wrap);
    return { wrap, close };
  };

  E.closeSheet = function () {
    const root = document.getElementById("modal-root");
    if (root) root.innerHTML = "";
  };

  E.fieldHTML = function (field) {
    const type = field.type || "text";
    const id = `field_${field.name}_${Math.random().toString(36).slice(2, 7)}`;
    const value = field.value == null ? "" : field.value;
    const required = field.required ? "required" : "";
    const placeholder = E.escapeHTML(field.placeholder || "");
    const label = E.escapeHTML(field.label || field.name || "");
    let input = "";

    if (type === "textarea") {
      input = `<textarea id="${id}" name="${E.escapeHTML(field.name)}" placeholder="${placeholder}" ${required}>${E.escapeHTML(value)}</textarea>`;
    } else if (type === "select") {
      const options = (field.options || []).map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const t = typeof opt === "string" ? opt : opt.label;
        return `<option value="${E.escapeHTML(v)}" ${String(v) === String(value) ? "selected" : ""}>${E.escapeHTML(t)}</option>`;
      }).join("");
      input = `<select id="${id}" name="${E.escapeHTML(field.name)}" ${required}>${options}</select>`;
    } else if (type === "checkbox") {
      return `<label class="field check-row" style="display:flex;align-items:center;gap:8px;padding:4px 2px 12px">
        <input id="${id}" name="${E.escapeHTML(field.name)}" type="checkbox" ${value ? "checked" : ""} style="width:auto">
        <span style="font-size:12px;color:var(--text)">${label}</span>
      </label>`;
    } else if (type === "file") {
      input = `<input id="${id}" name="${E.escapeHTML(field.name)}" type="file" accept="${E.escapeHTML(field.accept || "")}" ${field.multiple ? "multiple" : ""}>`;
    } else {
      const step = type === "number" ? `step="${field.step || "0.01"}"` : "";
      input = `<input id="${id}" name="${E.escapeHTML(field.name)}" type="${E.escapeHTML(type)}" value="${E.escapeHTML(value)}" placeholder="${placeholder}" ${step} ${required}>`;
    }

    return `<div class="field" ${field.full ? 'style="grid-column:1/-1"' : ""}>
      <label for="${id}">${label}${field.required ? " *" : ""}</label>
      ${input}
      ${field.hint ? `<div class="hint">${E.escapeHTML(field.hint)}</div>` : ""}
    </div>`;
  };

  E.formSheet = function (options) {
    const opts = options || {};
    const fields = opts.fields || [];
    const body = `
      <form data-sheet-form>
        ${opts.extraHTML || ""}
        ${fields.map(E.fieldHTML).join("")}
        <div class="sheet-actions">
          <button class="btn ghost" type="button" data-sheet-close>取消</button>
          <button class="btn" type="submit">${E.escapeHTML(opts.submitLabel || "保存")}</button>
        </div>
      </form>
    `;
    const sheet = E.openSheet({
      title: opts.title || "",
      body,
      onMount(wrap) {
        const form = wrap.querySelector("[data-sheet-form]");
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const values = {};
          for (const field of fields) {
            const el = form.elements[field.name];
            if (!el) continue;
            if (field.type === "checkbox") {
              values[field.name] = !!el.checked;
            } else if (field.type === "file") {
              const file = el.files && el.files[0] ? el.files[0] : null;
              values[field.name] = file;
              if (file && field.readAsDataUrl) {
                values[`${field.name}DataUrl`] = await E.readFileAsDataURL(file);
              }
            } else if (field.type === "number") {
              values[field.name] = Number(el.value);
            } else {
              values[field.name] = el.value;
            }
          }
          try {
            const result = await opts.onSubmit(values);
            if (result !== false) sheet.close();
          } catch (error) {
            E.toast(error && error.message ? error.message : "保存失败");
          }
        });
        if (typeof opts.onMount === "function") opts.onMount(wrap, sheet);
      }
    });
    return sheet;
  };

  E.readFileAsText = function (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("读取文件失败"));
      reader.readAsText(file, "utf-8");
    });
  };

  E.readFileAsDataURL = function (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("读取文件失败"));
      reader.readAsDataURL(file);
    });
  };

  E.download = function (filename, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type || "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  E.parseCharacterJson = function (raw) {
    let data = raw;
    if (typeof raw === "string") {
      data = JSON.parse(raw);
    }
    if (!data || typeof data !== "object") throw new Error("角色卡格式不正确");
    if (data.spec && data.data) data = data.data;
    const name = String(data.name || data.char_name || "").trim();
    if (!name) throw new Error("角色卡缺少名字");

    const personaParts = [];
    if (data.description) personaParts.push(String(data.description));
    if (data.personality) personaParts.push(`性格：${data.personality}`);
    if (data.scenario) personaParts.push(`场景：${data.scenario}`);
    if (data.system_prompt) personaParts.push(`系统提示：${data.system_prompt}`);
    if (data.post_history_instructions) personaParts.push(`补充要求：${data.post_history_instructions}`);

    const worldbook = [];
    const book = data.character_book || data.worldbook || data.lorebook;
    if (book && Array.isArray(book.entries)) {
      book.entries.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") return;
        const title = entry.comment || entry.name || (Array.isArray(entry.keys) ? entry.keys.join(" / ") : "") || `设定 ${index + 1}`;
        const content = entry.content || entry.text || "";
        if (content) worldbook.push({ id: E.uid("wb"), title: String(title), content: String(content) });
      });
    }

    return {
      id: E.uid("char"),
      name,
      persona: personaParts.join("\n\n") || "一个住在手机里的角色。",
      greeting: String(data.first_mes || data.greeting || ""),
      example: String(data.mes_example || data.example || ""),
      relationship: String(data.relationship || "朋友"),
      color: "#c87f8a",
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      worldbook,
      createdAt: Date.now()
    };
  };

  E.parsePngCharacter = async function (file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
      throw new Error("不是有效的 PNG 文件");
    }
    let offset = 8;
    const decoder = new TextDecoder("utf-8");
    while (offset + 12 <= bytes.length) {
      const length = ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
      const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;
      if (dataEnd > bytes.length) break;
      if (type === "tEXt" || type === "iTXt") {
        const chunk = bytes.slice(dataStart, dataEnd);
        const zero = chunk.indexOf(0);
        if (zero > 0) {
          const keyword = decoder.decode(chunk.slice(0, zero));
          if (keyword === "chara" || keyword === "ccv3" || keyword === "Chara") {
            let text;
            if (type === "tEXt") {
              text = decoder.decode(chunk.slice(zero + 1));
            } else {
              let p = zero + 1;
              const compressionFlag = chunk[p++];
              p += 1;
              while (p < chunk.length && chunk[p] !== 0) p++;
              p++;
              while (p < chunk.length && chunk[p] !== 0) p++;
              p++;
              text = decoder.decode(chunk.slice(p));
              if (compressionFlag === 1) continue;
            }
            const json = JSON.parse(atob(text.trim()));
            const character = E.parseCharacterJson(json);
            character.avatar = await E.readFileAsDataURL(file);
            return character;
          }
        }
      }
      offset = dataEnd + 4;
    }
    throw new Error("这个 PNG 里没有找到角色卡数据");
  };

  E.readCharacterFile = async function (file) {
    if (!file) throw new Error("没有选择文件");
    const name = String(file.name || "").toLowerCase();
    if (name.endsWith(".png")) return E.parsePngCharacter(file);
    const text = await E.readFileAsText(file);
    return E.parseCharacterJson(text);
  };

  E.exportCharacter = function (character) {
    const data = {
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: character.name,
        description: character.persona || "",
        personality: "",
        scenario: "",
        first_mes: character.greeting || "",
        mes_example: character.example || "",
        creator_notes: "导出自余温机",
        system_prompt: "",
        post_history_instructions: "",
        tags: character.tags || [],
        character_book: {
          entries: (character.worldbook || []).map((entry) => ({
            comment: entry.title,
            content: entry.content,
            keys: []
          }))
        }
      }
    };
    E.download(`${character.name || "character"}.json`, JSON.stringify(data, null, 2));
  };

  E.normalizeCharacter = function (character) {
    const c = character || {};
    const proactiveMode = ["inherit", "off", "quiet", "normal", "lively"].includes(c.proactiveMode)
      ? c.proactiveMode
      : "inherit";
    return {
      id: c.id || E.uid("char"),
      name: String(c.name || "未命名角色"),
      persona: String(c.persona || ""),
      greeting: String(c.greeting || ""),
      example: String(c.example || ""),
      relationship: String(c.relationship || "朋友"),
      color: String(c.color || "#c87f8a"),
      avatar: String(c.avatar || ""),
      tags: Array.isArray(c.tags) ? c.tags : [],
      worldbook: Array.isArray(c.worldbook) ? c.worldbook : [],
      proactiveMode,
      relationshipState: typeof E.normalizeRelationshipState === "function"
        ? E.normalizeRelationshipState(c.relationshipState)
        : (c.relationshipState && typeof c.relationshipState === "object" ? c.relationshipState : null),
      createdAt: Number(c.createdAt) || Date.now()
    };
  };

  E.normalizeMemory = function (memory, fallbackCharacterId) {
    const m = memory || {};
    const createdAt = Number(m.createdAt) || Date.now();
    const source = ["auto", "manual", "seed"].includes(m.source) ? m.source : "manual";
    const content = String(m.content || "").trim();
    const characterId = String(m.characterId || fallbackCharacterId || "");
    const scope = ["private", "group", "public"].includes(m.scope) ? m.scope : "private";
    const knownBy = Array.isArray(m.knownBy)
      ? Array.from(new Set(m.knownBy.map(String).filter(Boolean)))
      : (characterId ? [characterId] : []);
    const layer = typeof E.normalizeMemoryLayer === "function"
      ? E.normalizeMemoryLayer(m.layer || m.memoryLayer, content)
      : "fact";
    const tags = typeof E.normalizeMemoryTags === "function"
      ? E.normalizeMemoryTags(m.tags, content)
      : [];
    return {
      id: m.id || E.uid("mem"),
      characterId,
      content,
      importance: E.clamp(Number(m.importance) || 3, 1, 5),
      pinned: !!m.pinned,
      source,
      scope,
      knownBy,
      layer,
      tags,
      sourceChatId: String(m.sourceChatId || ""),
      sourceMessageIds: Array.isArray(m.sourceMessageIds) ? m.sourceMessageIds.map(String) : [],
      sourceEventId: String(m.sourceEventId || ""),
      confidence: E.clamp(Number(m.confidence) || 0.8, 0, 1),
      lastConfirmedAt: Number(m.lastConfirmedAt) || 0,
      lastUsedAt: Number(m.lastUsedAt) || 0,
      useCount: Number(m.useCount) || 0,
      createdAt,
      updatedAt: Number(m.updatedAt) || createdAt
    };
  };

  // ---------- IndexedDB with localStorage fallback ----------

  E.db = (function () {
    const DB_NAME = "ember_phone";
    const DB_VERSION = 1;
    const LS_PREFIX = "ember_store_";
    let dbPromise = null;
    let fallback = false;

    function open() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve) => {
        // file:// 下部分浏览器会把 IndexedDB 挂起而不触发 success/error。
        // 单文件版优先保证双击可用，因此直接走 localStorage 兜底。
        if (location.protocol === "file:" || !window.indexedDB) {
          fallback = true;
          resolve(null);
          return;
        }
        let request;
        try {
          request = indexedDB.open(DB_NAME, DB_VERSION);
        } catch (error) {
          fallback = true;
          resolve(null);
          return;
        }
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const store of E.STORES) {
            if (db.objectStoreNames.contains(store)) continue;
            const os = db.createObjectStore(store, { keyPath: store === "meta" ? "key" : "id" });
            if (store === "messages") {
              os.createIndex("chatId", "chatId", { unique: false });
              os.createIndex("createdAt", "createdAt", { unique: false });
            }
            if (["chats", "moments", "calls", "diary", "anniversaries", "wallet", "forum", "memories"].includes(store)) {
              os.createIndex("createdAt", "createdAt", { unique: false });
            }
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          fallback = true;
          resolve(null);
        };
        request.onblocked = () => {
          fallback = true;
          resolve(null);
        };
      });
      return dbPromise;
    }

    function lsGet(store) {
      try {
        return JSON.parse(localStorage.getItem(LS_PREFIX + store) || "[]");
      } catch (error) {
        return [];
      }
    }

    function lsSet(store, rows) {
      try {
        localStorage.setItem(LS_PREFIX + store, JSON.stringify(rows));
      } catch (error) {
        if (error && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
          throw new Error("本地存储空间不足。请先导出备份，再删除一些照片或音乐；也可以改用本地静态服务器打开以启用 IndexedDB。");
        }
        throw error;
      }
    }

    async function getAll(store) {
      const db = await open();
      if (fallback || !db) return lsGet(store);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    }

    async function get(store, key) {
      const db = await open();
      if (fallback || !db) {
        const keyName = store === "meta" ? "key" : "id";
        return lsGet(store).find((row) => row && row[keyName] === key) || null;
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    }

    async function put(store, value) {
      const db = await open();
      if (fallback || !db) {
        const keyName = store === "meta" ? "key" : "id";
        const rows = lsGet(store);
        const index = rows.findIndex((row) => row && row[keyName] === value[keyName]);
        if (index >= 0) rows[index] = value;
        else rows.push(value);
        lsSet(store, rows);
        return value;
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value);
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => reject(tx.error);
      });
    }

    async function bulkPut(store, values) {
      const db = await open();
      if (!values || !values.length) return;
      if (fallback || !db) {
        const keyName = store === "meta" ? "key" : "id";
        const rows = lsGet(store);
        for (const value of values) {
          const index = rows.findIndex((row) => row && row[keyName] === value[keyName]);
          if (index >= 0) rows[index] = value;
          else rows.push(value);
        }
        lsSet(store, rows);
        return;
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const os = tx.objectStore(store);
        values.forEach((value) => os.put(value));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    async function del(store, key) {
      const db = await open();
      if (fallback || !db) {
        const keyName = store === "meta" ? "key" : "id";
        lsSet(store, lsGet(store).filter((row) => row && row[keyName] !== key));
        return;
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    async function clear(store) {
      const db = await open();
      if (fallback || !db) {
        lsSet(store, []);
        return;
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    async function clearAll() {
      for (const store of E.STORES) {
        await clear(store);
      }
    }

    async function getMeta(key, fallbackValue) {
      const row = await get("meta", key);
      return row ? row.value : fallbackValue;
    }

    async function setMeta(key, value) {
      return put("meta", { key, value });
    }

    return { open, getAll, get, put, bulkPut, del, clear, clearAll, getMeta, setMeta };
  })();
})();
