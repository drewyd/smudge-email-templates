/**
 * A module-resolution hook that reproduces the condition set a Next.js route
 * handler is built under, which is NOT what bare `node --conditions=react-server`
 * gives you.
 *
 * Next applies React's `react-server` condition when it collects page data for a
 * route handler, so `react` resolves to `react.react-server.js`, which exports no
 * `createContext` and no `useContext`. That is the trap this package fell into on
 * 6 Sep 2026.
 *
 * But bare `--conditions=react-server` ALSO sends `react-dom/server` to
 * `server.react-server.js`, which has no `renderToStaticMarkup` — and this package
 * imports that on line 24 of branded.tsx, on purpose, because rendering markup is
 * its whole job. Next does not take that away; a bare condition flag does. Left
 * alone, the guard would be permanently red for a reason that is not a fault, and
 * a guard that stops the good thing forever gets switched off.
 *
 * So: `react` stays on the react-server build (the thing under test) and
 * `react-dom/server` is pinned to its node build (the thing Next supplies anyway).
 *
 * Not used on its own. `react-server-condition.mjs` registers it.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require_ = createRequire(import.meta.url);

/** react-dom's real server build, the one that has renderToStaticMarkup. */
const REACT_DOM_SERVER = pathToFileURL(
  require_.resolve("react-dom/package.json").replace(/package\.json$/, "server.node.js"),
).href;

const REDIRECT = new Set([
  "react-dom/server",
  "react-dom/server.node",
  "react-dom/server.browser",
]);

export async function resolve(specifier, context, nextResolve) {
  if (REDIRECT.has(specifier)) {
    return { url: REACT_DOM_SERVER, format: "commonjs", shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
