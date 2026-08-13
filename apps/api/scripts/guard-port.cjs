#!/usr/bin/env node
/**
 * Port guard for `pnpm --filter @pokemon-vault/api dev` (and `pnpm dev`).
 *
 * Prevents the confusing `EADDRINUSE` crash when another process — usually the
 * native dev-env stack (scripts/dev-env.sh) still running from a previous
 * session — already holds the API port. Exits with a clear, actionable
 * message instead of a raw Node stack trace.
 */
"use strict";
const net = require("node:net");

const port = Number(process.env.POKE_VAULT_API_PORT || 3001);

const server = net.createServer();
server.once("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n[api] Port ${port} is already in use.\n` +
        `  This usually means the dev-env stack (scripts/dev-env.sh) is still running.\n` +
        `  Stop it with:        ./scripts/dev-env.sh down\n` +
        `  Or run on another port:  POKE_VAULT_API_PORT=3002 pnpm dev\n`,
    );
    process.exit(1);
  }
  throw err;
});
server.once("listening", () => server.close(() => process.exit(0)));
server.listen(port, "127.0.0.1");
