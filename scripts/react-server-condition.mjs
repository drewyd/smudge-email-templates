/**
 * The check that would have caught the 6 Sep 2026 outage, and did not exist.
 *
 * WHAT HAPPENED. v0.4.0 added `React.createContext` at module scope in
 * branded.tsx to carry the email theme. Next.js collects page data for a route
 * handler under React's `react-server` condition, where `createContext` does not
 * exist, so every server route that reached this package threw
 * "n.createContext is not a function" and `next build` died. Both apps were
 * unable to deploy for about half an hour. v0.4.3 passes the theme as a prop
 * instead.
 *
 * WHY NOTHING SAW IT. The byte-identical drill is 394 checks, the gift-card drill
 * is 19 fixtures, `tsc` is clean, and the apps carry 1838 unit tests. All of them
 * passed with the bug live, because not one of them resolves this package under
 * the `react-server` condition — and neither runs a production build. The fault
 * is in module RESOLUTION, and nothing here was looking at resolution.
 *
 * TWO DOORS, because one is not enough:
 *
 *   1. IMPORT. Every entry point in the exports map is imported for real, under
 *      the react-server condition. This is the door the fault came through, and
 *      it catches the whole class: any React export missing from that build,
 *      touched at module scope, anywhere in the graph.
 *   2. SOURCE. Every file under src/ is scanned for ANY use of a React export the
 *      react-server build does not have. The list is computed from the INSTALLED
 *      React, never hardcoded, so it stays true when React changes. This door
 *      still answers when the first cannot run.
 *
 * Both are drilled in both directions on every run: the fault is injected into a
 * throwaway copy of src/ and both doors must go red, then the real tree must be
 * green. A guard nobody has watched fail is not a guard.
 *
 * Run: npx tsx scripts/react-server-condition.mjs
 *      npx tsx scripts/react-server-condition.mjs --no-drill   (skip the drill)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const LOADER = path.join(HERE, "react-server-loader.mjs");

const results = [];
const record = (ok, name, detail = "") => {
  results.push({ ok, name, detail });
  console.log(`${ok ? "  OK  " : " FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
};

// ---------------------------------------------------------------------------
// What the react-server build of React does not give you
// ---------------------------------------------------------------------------

/**
 * Read both builds of the installed React and return the names the react-server
 * one is missing. Computed, not written down: a hardcoded list would describe
 * the day it was typed, and this file is meant to outlive that.
 */
function missingReactExports() {
  const probe = `
    import * as full from ${JSON.stringify(path.join(ROOT, "node_modules/react/index.js"))};
    import * as server from ${JSON.stringify(path.join(ROOT, "node_modules/react/react.react-server.js"))};
    const missing = Object.keys(full).filter((k) => !(k in server));
    console.log(JSON.stringify(missing.sort()));
  `;
  const out = runNode(probe, { conditions: false });
  if (!out.ok) throw new Error(`could not read React's two builds:\n${out.stderr}`);
  return JSON.parse(out.stdout.trim().split("\n").pop());
}

// ---------------------------------------------------------------------------
// Running node the way Next does
// ---------------------------------------------------------------------------

function runNode(source, { conditions = true, cwd = ROOT } = {}) {
  const tmp = path.join(ROOT, `.react-server-check-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmp, source);
  try {
    const r = spawnSync("npx", ["tsx", tmp], {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_OPTIONS: conditions ? "--conditions=react-server" : "",
      },
    });
    return { ok: r.status === 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/** Import one entry point under the react-server condition. */
function importsCleanly(entryFile) {
  const source = `
    import { register } from "node:module";
    import { pathToFileURL } from "node:url";
    register(pathToFileURL(${JSON.stringify(LOADER)}).href);
    const React = await import("react");
    if (typeof React.createContext !== "undefined") {
      console.error("REFUSING: react resolved to the FULL build, so this proves nothing");
      process.exit(2);
    }
    await import(pathToFileURL(${JSON.stringify("")} + ${JSON.stringify(entryFile)}).href);
    console.log("imported");
  `;
  return runNode(source);
}

// ---------------------------------------------------------------------------
// Door 2: the source scan
// ---------------------------------------------------------------------------

/**
 * Strip comments and string literals before looking for anything.
 *
 * branded.tsx's own header now explains the outage and says the words
 * "React.createContext" while doing it. A scan that reads comments would fire on
 * the very note left to stop this happening again, and the obvious fix — deleting
 * the note — is the wrong one.
 */
function stripCommentsAndStrings(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const two = src.slice(i, i + 2);
    if (two === "//") {
      while (i < n && src[i] !== "\n") i++;
    } else if (two === "/*") {
      i += 2;
      while (i < n && src.slice(i, i + 2) !== "*/") i++;
      i += 2;
    } else if (src[i] === '"' || src[i] === "'" || src[i] === "`") {
      const q = src[i];
      i++;
      while (i < n && src[i] !== q) {
        if (src[i] === "\\") i++;
        i++;
      }
      i++;
      out += '""';
    } else {
      out += src[i];
      i++;
    }
  }
  return out;
}

/**
 * Any use at all of a React export the react-server build lacks.
 *
 * Deliberately NOT scope-aware. The first draft counted braces to decide what was
 * module scope, and the drill caught it reading a 1,500-line TSX file's depth
 * wrongly and missing an injected fault it was staring at. Whether a call is
 * evaluated on import is exactly the question door 1 answers by running the code;
 * this door is the cheap net behind it, and a net with a scope heuristic in it is
 * a net with a hole.
 *
 * The rule it can afford: this package renders to static markup and has no client
 * components, so it has no business calling any of these at all. Measured on
 * v0.4.3, the count is zero, comments included.
 */
function missingExportUses(src, names) {
  const code = stripCommentsAndStrings(src);
  const hits = [];

  // Names pulled straight off "react" in this file, used bare afterwards.
  const bare = new Set();
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*""/g)) {
    for (const part of m[1].split(",")) {
      const local = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (local && names.includes(local)) bare.add(local);
    }
  }

  const lines = code.split("\n");
  for (let ln = 0; ln < lines.length; ln++) {
    for (const name of names) {
      // `React.createContext`, `__DrillReact.createContext`, or a bare import.
      const namespaced = new RegExp(`\\.\\s*${name}\\b`);
      const imported = bare.has(name) && new RegExp(`\\b${name}\\b`).test(lines[ln]);
      if (namespaced.test(lines[ln]) || imported) {
        hits.push({ line: ln + 1, name, text: lines[ln].trim().slice(0, 100) });
      }
    }
  }
  return hits;
}

function sourceFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? sourceFiles(path.join(dir, e.name))
        : /\.(ts|tsx|mts|js|mjs)$/.test(e.name)
          ? [path.join(dir, e.name)]
          : [],
    );
}

function scanSource(srcDir, names) {
  const found = [];
  for (const file of sourceFiles(srcDir)) {
    for (const hit of missingExportUses(fs.readFileSync(file, "utf8"), names)) {
      found.push({ file: path.relative(ROOT, file), ...hit });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// The drill
// ---------------------------------------------------------------------------

const FAULT = `
// injected by the drill
import * as __DrillReact from "react";
export const __DRILL_CONTEXT = __DrillReact.createContext(null);
`;

function drill(missing) {
  const copy = path.join(ROOT, ".drill-src");
  fs.rmSync(copy, { recursive: true, force: true });
  fs.cpSync(path.join(ROOT, "src"), copy, { recursive: true });
  try {
    const target = path.join(copy, "branded.tsx");
    fs.writeFileSync(target, fs.readFileSync(target, "utf8") + FAULT);

    const imported = importsCleanly(path.join(copy, "index.ts"));
    record(
      !imported.ok && /createContext is not a function/.test(imported.stderr),
      "drill: door 1 goes RED on an injected module-scope createContext",
      imported.ok ? "it imported cleanly, so the door is not watching" : "threw the production error",
    );

    const scanned = scanSource(copy, missing);
    record(
      scanned.some((h) => h.name === "createContext"),
      "drill: door 2 goes RED on the same injection",
      scanned.length ? `saw ${scanned.length}` : "saw nothing",
    );
  } finally {
    fs.rmSync(copy, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------

console.log("react-server condition guard\n");

const missing = missingReactExports();
console.log(`React's react-server build is missing ${missing.length} exports the full build has.`);
console.log(`Watching for: ${missing.join(", ")}\n`);

if (!missing.includes("createContext")) {
  record(false, "sanity: createContext is among the missing exports", "it is not — has React changed?");
}

const entries = Object.entries(JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).exports)
  .map(([name, spec]) => [name, path.join(ROOT, spec.default)]);

for (const [name, file] of entries) {
  const r = importsCleanly(file);
  record(r.ok, `door 1: "${name}" imports under the react-server condition`, r.ok ? "" : firstError(r.stderr));
}

const hits = scanSource(path.join(ROOT, "src"), missing);
record(
  hits.length === 0,
  "door 2: src/ uses no React export the react-server build lacks",
  hits.map((h) => `${h.file}:${h.line} ${h.name}`).join("; "),
);

if (!process.argv.includes("--no-drill")) drill(missing);

function firstError(stderr) {
  const line = stderr.split("\n").find((l) => /Error|error/.test(l));
  return (line ?? stderr.split("\n")[0] ?? "").trim().slice(0, 160);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("\nA React export missing from the react-server build is being used where it");
  console.log("is evaluated on import. Pass the value as a prop or an argument instead.");
  console.log("Nothing importable by a server route may call createContext or useContext.");
  process.exit(1);
}
