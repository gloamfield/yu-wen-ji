import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const outArgIndex = process.argv.indexOf("--out");
const out = outArgIndex >= 0 && process.argv[outArgIndex + 1]
  ? resolve(root, process.argv[outArgIndex + 1])
  : root;

const template = await readFile(join(src, "index.template.html"), "utf8");
const css = await readFile(join(src, "styles.css"), "utf8");

const jsFiles = [
  "01-core.js",
  "01b-themes.js",
  "02-state.js",
  "02b-life-engine.js",
  "02c-life-state.js",
  "02d-proactive.js",
  "03-providers.js",
  "04-shell.js",
  "05-contacts.js",
  "06-chat.js",
  "07-social.js",
  "08-life.js",
  "09-settings.js",
  "10-boot.js",
];

const jsParts = [];
const themeAssets = await readFile(join(src, "theme-assets.js"), "utf8").catch(() => "");
if (themeAssets) {
  jsParts.push(`/* ===== theme-assets.js ===== */\n${themeAssets}`);
}
for (const file of jsFiles) {
  jsParts.push(`/* ===== ${file} ===== */\n` + await readFile(join(src, "js", file), "utf8"));
}

const js = jsParts.join("\n\n").replaceAll("</script>", "<\\/script>");
const html = template
  .replace("/*__STYLES__*/", css)
  .replace("/*__SCRIPTS__*/", js);

await mkdir(out, { recursive: true });
await writeFile(join(out, "余温机.html"), html, "utf8");
console.log(`built ${join(out, "余温机.html")}`);
