#!/usr/bin/env node
/**
 * Pokémon Vault — docs server (dependency-free).
 *
 * Serves the markdown documentation in ./docs as a browsable static site:
 *   - /                    index page (all docs, grouped)
 *   - /docs/<path>.md      rendered HTML (sidebar nav + content)
 *   - /raw/<path>.md       raw markdown
 *
 * Includes a small self-contained CommonMark-ish renderer (headings, fenced
 * code, inline code, bold/italic, links, lists, tables, blockquotes, hr) —
 * no npm deps, no build step.
 *
 * Port: POKE_VAULT_DOCS_PORT (default 8080).
 */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
const PORT = Number(process.env.POKE_VAULT_DOCS_PORT || 8080);

// ---------------------------------------------------------------------------
// Markdown → HTML (escape-first, then inline formatting)
// ---------------------------------------------------------------------------
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s) {
  let out = esc(s);
  // inline code
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  // links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, t, u) => {
    const href = u.startsWith("http") ? u : u;
    return `<a href="${esc(href)}">${t}</a>`;
  });
  return out;
}

function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;
  let listType = null; // "ul" | "ol" | null
  let inTable = false;
  let tableRows = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeTable = () => {
    if (inTable) {
      if (tableRows.length) {
        const body = tableRows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
          .join("");
        html.push(`<table><thead>${tableRows[0] ? "" : ""}</thead><tbody>${body}</tbody></table>`);
      }
      inTable = false;
      tableRows = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      closeList(); closeTable();
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      html.push(`<pre><code class="language-${esc(lang)}">${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // table
    if (/^\|/.test(line)) {
      const cells = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      if (!inTable) { inTable = true; tableRows = []; }
      // skip separator rows (| --- | --- |)
      if (/^:?-{2,}:?$/.test(cells.join("").replace(/\s/g, ""))) { i++; continue; }
      tableRows.push(cells);
      i++;
      continue;
    }
    if (inTable && !/^\|/.test(line)) closeTable();

    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeList(); closeTable();
      const level = h[1].length;
      const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      html.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // hr
    if (/^(\s*)(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      closeList(); closeTable();
      html.push("<hr/>");
      i++;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      closeList(); closeTable();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote>${renderMarkdown(buf.join("\n"))}</blockquote>`);
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      closeTable();
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      const item = line.replace(/^\s*[-*+]\s+/, "");
      // nested: if next line is indented list, render sub
      html.push(`<li>${inline(item)}</li>`);
      i++;
      continue;
    }
    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      closeTable();
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      const item = line.replace(/^\s*\d+\.\s+/, "");
      html.push(`<li>${inline(item)}</li>`);
      i++;
      continue;
    }
    closeList();

    // blank line
    if (/^\s*$/.test(line)) {
      closeTable();
      i++;
      continue;
    }

    // paragraph (collect consecutive non-special lines)
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\|/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    html.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  closeList();
  closeTable();
  return html.join("\n");
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
function listDocs(dir = DOCS, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const rel = path.join(prefix, entry.name);
    if (entry.isDirectory()) out.push(...listDocs(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith(".md")) out.push(rel.replace(/\\/g, "/"));
  }
  return out;
}

const TITLE = "Pokémon Vault — Documentation";

function layout(title, nav, body) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<style>
:root{--bg:#0d1117;--panel:#161b22;--border:#30363d;--fg:#e6edf3;--muted:#8b949e;--accent:#c6f24c;--link:#79c0ff;--code:#ffa657}
*{box-sizing:border-box}
body{margin:0;font:15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg)}
.wrap{display:flex;min-height:100vh}
nav{width:280px;flex:0 0 280px;background:var(--panel);border-right:1px solid var(--border);padding:20px 16px;position:sticky;top:0;height:100vh;overflow-y:auto}
nav h1{font-size:15px;margin:0 0 6px}
nav .sub{color:var(--muted);font-size:12px;margin-bottom:16px}
nav a{display:block;color:var(--link);text-decoration:none;padding:3px 8px;border-radius:6px;font-size:13px}
nav a:hover{background:#21262d}
nav .grp{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 4px}
main{flex:1;padding:32px 40px;max-width:960px}
h1,h2,h3,h4{line-height:1.25}
h1{border-bottom:1px solid var(--border);padding-bottom:10px}
h2{margin-top:28px;border-bottom:1px solid var(--border);padding-bottom:6px}
code{background:#21262d;border-radius:4px;padding:1px 5px;color:var(--code);font-size:13px}
pre{background:#161b22;border:1px solid var(--border);border-radius:8px;padding:14px;overflow-x:auto}
pre code{background:none;padding:0;color:var(--fg)}
a{color:var(--link)}
table{border-collapse:collapse;width:100%;margin:12px 0}
th,td{border:1px solid var(--border);padding:7px 11px;text-align:left;font-size:14px}
th{background:#21262d}
blockquote{margin:12px 0;padding:2px 16px;border-left:4px solid var(--accent);background:#161b22;border-radius:0 8px 8px 0;color:var(--muted)}
ul,ol{padding-left:24px}
hr{border:none;border-top:1px solid var(--border);margin:24px 0}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.card{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px}
.card h3{margin:0 0 6px;font-size:15px}
.card p{margin:0;color:var(--muted);font-size:13px}
.card a{text-decoration:none;color:var(--fg)}
.card a:hover{color:var(--accent)}
.raw{margin-top:8px;font-size:12px;color:var(--muted)}
</style></head><body>
<div class="wrap">
${nav}
<main>${body}</main>
</div></body></html>`;
}

function indexPage() {
  const files = listDocs();
  const groups = new Map();
  for (const f of files) {
    const parts = f.split("/");
    const g = parts.length > 1 ? parts[0] : "top";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(f);
  }
  const cards = [];
  for (const [g, fs] of groups) {
    const label = g === "top" ? "Core docs" : g.charAt(0).toUpperCase() + g.slice(1);
    for (const f of fs) {
      const name = path.basename(f, ".md");
      const title = name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      cards.push(
        `<div class="card"><h3><a href="/docs/${f}">${esc(title)}</a></h3>` +
          `<p>${esc(f)}</p></div>`,
      );
    }
    void label;
  }
  const nav = `<nav><h1>${TITLE}</h1><div class="sub">Browse the project docs</div>` +
    `<a href="/">Index</a></nav>`;
  const body =
    `<h1>Pokémon Vault — Documentation</h1><p>All project documentation rendered from <code>docs/</code>.</p>` +
    `<div class="cards">${cards.join("")}</div>`;
  return layout("Index", nav, body);
}

function docPage(rel) {
  const abs = path.join(DOCS, rel);
  const safe = abs.startsWith(DOCS + path.sep) || abs === DOCS;
  if (!safe || !fs.existsSync(abs) || !abs.endsWith(".md")) return null;
  const md = fs.readFileSync(abs, "utf8");
  const files = listDocs();
  const nav = `<nav><h1>${TITLE}</h1><div class="sub">${esc(rel)}</div><a href="/">← Index</a>` +
    files.map((f) => `<a href="/docs/${f}">${esc(f)}</a>`).join("") + `</nav>`;
  const title = path.basename(rel, ".md").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const body = renderMarkdown(md) +
    `<p class="raw"><a href="/raw/${rel}">View raw markdown</a></p>`;
  return layout(`${title} — ${TITLE}`, nav, body);
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = decodeURIComponent(url.pathname);

  if (p === "/" || p === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(indexPage());
    return;
  }
  if (p.startsWith("/docs/")) {
    const rel = p.slice("/docs/".length);
    const html = docPage(rel);
    if (html) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  if (p.startsWith("/raw/")) {
    const rel = p.slice("/raw/".length);
    const abs = path.join(DOCS, rel);
    if (abs.startsWith(DOCS) && fs.existsSync(abs) && abs.endsWith(".md")) {
      res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
      res.end(fs.readFileSync(abs));
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`📚 Pokémon Vault docs server → http://localhost:${PORT}`);
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[docs] Port ${PORT} already in use — set POKE_VAULT_DOCS_PORT to another port.`);
    process.exit(1);
  }
  throw err;
});
