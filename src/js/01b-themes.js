(function () {
  "use strict";

  const E = window.Ember;
  const assets = window.EmberThemeAssets || {};

  const META = {
    "rose-frost": {
      name: "玫瑰霜",
      tagline: "玫瑰粉 · 珍珠白",
      description: "像一层被晨光烘暖的霜，柔软但不甜腻。",
      mode: "light",
      accent: "#c87f8a",
      accent2: "#8b6f8f",
      accentSoft: "rgba(200, 127, 138, .15)",
      tokens: {
        phoneBg: "#f6eff0",
        card: "#fffafb",
        card2: "#fbf3f5",
        text: "#2a2023",
        muted: "#7c6b71",
        line: "rgba(61, 43, 49, .10)",
        press: "rgba(61, 43, 49, .06)",
        glass: "rgba(255, 250, 251, .58)",
        glassStrong: "rgba(255, 250, 251, .84)",
        homeIndicator: "rgba(42, 32, 35, .22)",
        glassBorder: "rgba(255, 255, 255, .58)",
        labelShadow: "0 1px 7px rgba(255, 255, 255, .62)",
        shadowSm: "0 4px 18px rgba(60, 36, 44, .10)",
        homeOverlay: "linear-gradient(180deg, rgba(255, 247, 248, .50), rgba(255, 247, 248, .10) 45%, rgba(255, 247, 248, .52))",
        lockOverlay: "linear-gradient(180deg, rgba(48, 18, 31, .40), rgba(48, 18, 31, .10) 45%, rgba(48, 18, 31, .50))"
      }
    },
    "moon-ink": {
      name: "月墨",
      tagline: "午夜蓝 · 月白",
      description: "深色玻璃里留一线月光，适合夜里慢慢说话。",
      mode: "dark",
      accent: "#8fa8d8",
      accent2: "#6173a6",
      accentSoft: "rgba(143, 168, 216, .18)",
      tokens: {
        phoneBg: "#0f1522",
        card: "#161e2e",
        card2: "#111827",
        text: "#edf3ff",
        muted: "#9aa9c2",
        line: "rgba(220, 235, 255, .12)",
        press: "rgba(220, 235, 255, .08)",
        glass: "rgba(13, 20, 35, .58)",
        glassStrong: "rgba(13, 20, 35, .84)",
        homeIndicator: "rgba(240, 248, 255, .28)",
        glassBorder: "rgba(255, 255, 255, .14)",
        labelShadow: "0 1px 8px rgba(0, 0, 0, .54)",
        shadowSm: "0 4px 18px rgba(0, 0, 0, .30)",
        homeOverlay: "linear-gradient(180deg, rgba(5, 9, 20, .40), rgba(5, 9, 20, .12) 45%, rgba(5, 9, 20, .50))",
        lockOverlay: "linear-gradient(180deg, rgba(3, 7, 16, .38), rgba(3, 7, 16, .08) 45%, rgba(3, 7, 16, .52))"
      }
    },
    "celadon-mist": {
      name: "青瓷雾",
      tagline: "青瓷绿 · 瓷白",
      description: "像一只温润的旧瓷杯，安静、克制、有呼吸感。",
      mode: "light",
      accent: "#6f9a86",
      accent2: "#3f6b5a",
      accentSoft: "rgba(111, 154, 134, .15)",
      tokens: {
        phoneBg: "#eef3ee",
        card: "#fbfdfb",
        card2: "#f2f7f2",
        text: "#20312b",
        muted: "#6f837b",
        line: "rgba(42, 70, 58, .10)",
        press: "rgba(42, 70, 58, .06)",
        glass: "rgba(252, 255, 252, .56)",
        glassStrong: "rgba(252, 255, 252, .84)",
        homeIndicator: "rgba(32, 49, 43, .22)",
        glassBorder: "rgba(255, 255, 255, .60)",
        labelShadow: "0 1px 7px rgba(255, 255, 255, .66)",
        shadowSm: "0 4px 18px rgba(42, 70, 58, .10)",
        homeOverlay: "linear-gradient(180deg, rgba(247, 252, 248, .50), rgba(247, 252, 248, .10) 45%, rgba(247, 252, 248, .54))",
        lockOverlay: "linear-gradient(180deg, rgba(17, 42, 34, .38), rgba(17, 42, 34, .10) 45%, rgba(17, 42, 34, .48))"
      }
    },
    "sea-glass": {
      name: "海盐玻璃",
      tagline: "海盐青 · 沙白",
      description: "清透的海玻璃与一点盐粒，适合明亮、轻快的白天。",
      mode: "light",
      accent: "#4fa9b8",
      accent2: "#2f778d",
      accentSoft: "rgba(79, 169, 184, .15)",
      tokens: {
        phoneBg: "#eef7f7",
        card: "#fbffff",
        card2: "#f2fafa",
        text: "#18343a",
        muted: "#617f86",
        line: "rgba(36, 76, 84, .10)",
        press: "rgba(36, 76, 84, .06)",
        glass: "rgba(250, 255, 255, .56)",
        glassStrong: "rgba(250, 255, 255, .84)",
        homeIndicator: "rgba(24, 52, 58, .22)",
        glassBorder: "rgba(255, 255, 255, .62)",
        labelShadow: "0 1px 7px rgba(255, 255, 255, .70)",
        shadowSm: "0 4px 18px rgba(36, 76, 84, .10)",
        homeOverlay: "linear-gradient(180deg, rgba(248, 255, 255, .48), rgba(248, 255, 255, .08) 45%, rgba(248, 255, 255, .52))",
        lockOverlay: "linear-gradient(180deg, rgba(8, 44, 52, .36), rgba(8, 44, 52, .08) 45%, rgba(8, 44, 52, .46))"
      }
    },
    "amber-dusk": {
      name: "琥珀暮",
      tagline: "琥珀 · 烟褐",
      description: "黄昏落在玻璃上，暖得像一句还没说完的话。",
      mode: "dark",
      accent: "#d19a5d",
      accent2: "#8e5b3d",
      accentSoft: "rgba(209, 154, 93, .18)",
      tokens: {
        phoneBg: "#1c1411",
        card: "#241a16",
        card2: "#1a120f",
        text: "#fff3e6",
        muted: "#c3aa91",
        line: "rgba(255, 236, 215, .12)",
        press: "rgba(255, 236, 215, .08)",
        glass: "rgba(29, 20, 16, .60)",
        glassStrong: "rgba(29, 20, 16, .85)",
        homeIndicator: "rgba(255, 244, 231, .28)",
        glassBorder: "rgba(255, 239, 220, .16)",
        labelShadow: "0 1px 8px rgba(0, 0, 0, .52)",
        shadowSm: "0 4px 18px rgba(0, 0, 0, .30)",
        homeOverlay: "linear-gradient(180deg, rgba(24, 12, 8, .38), rgba(24, 12, 8, .10) 45%, rgba(24, 12, 8, .50))",
        lockOverlay: "linear-gradient(180deg, rgba(22, 10, 6, .40), rgba(22, 10, 6, .10) 45%, rgba(22, 10, 6, .54))"
      }
    },
    "lilac-dawn": {
      name: "紫雾晨",
      tagline: "丁香紫 · 晨粉",
      description: "薄雾一样的丁香与晨粉，轻、软、带一点梦气。",
      mode: "light",
      accent: "#a486c4",
      accent2: "#cf8ca9",
      accentSoft: "rgba(164, 134, 196, .15)",
      tokens: {
        phoneBg: "#f7f0f8",
        card: "#fffaff",
        card2: "#fbf3fb",
        text: "#2c2334",
        muted: "#81718e",
        line: "rgba(70, 49, 86, .10)",
        press: "rgba(70, 49, 86, .06)",
        glass: "rgba(255, 250, 255, .58)",
        glassStrong: "rgba(255, 250, 255, .84)",
        homeIndicator: "rgba(44, 35, 52, .22)",
        glassBorder: "rgba(255, 255, 255, .60)",
        labelShadow: "0 1px 7px rgba(255, 255, 255, .66)",
        shadowSm: "0 4px 18px rgba(70, 49, 86, .10)",
        homeOverlay: "linear-gradient(180deg, rgba(255, 249, 255, .50), rgba(255, 249, 255, .10) 45%, rgba(255, 249, 255, .54))",
        lockOverlay: "linear-gradient(180deg, rgba(42, 24, 56, .38), rgba(42, 24, 56, .10) 45%, rgba(42, 24, 56, .48))"
      }
    }
  };

  E.THEME_PACKS = {};
  for (const [id, meta] of Object.entries(META)) {
    E.THEME_PACKS[id] = Object.assign({ id }, meta, assets[id] || {});
  }

  E.DEFAULT_THEME_PACK = "rose-frost";

  E.currentThemePack = function () {
    const id = (E.state && E.state.settings && E.state.settings.themePack) || E.DEFAULT_THEME_PACK;
    return E.THEME_PACKS[id] || E.THEME_PACKS[E.DEFAULT_THEME_PACK];
  };

  E.hashString = function (value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  E.themeAvatarFor = function (character) {
    const pack = E.currentThemePack();
    const pool = pack && Array.isArray(pack.avatars) ? pack.avatars : [];
    if (!pool.length) return "";
    const c = character || {};
    if (c.avatar) return c.avatar;
    if (c.id && E.state && Array.isArray(E.state.characters)) {
      const index = E.state.characters.findIndex((item) => item.id === c.id);
      if (index >= 0) return pool[index % pool.length];
    }
    const key = c.id || c.name || "ember";
    return pool[E.hashString(key) % pool.length];
  };

  E.themeIconFor = function (name) {
    const pack = E.currentThemePack();
    return pack && pack.icons && pack.icons[name] ? pack.icons[name] : "";
  };

  E.themePreviewStyle = function (pack) {
    const image = pack && (pack.wallpaperThumb || pack.wallpaper);
    return image ? `background-image:url(${image})` : "";
  };
})();
