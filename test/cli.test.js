import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { parseArgs, requestJson } from "../src/cli.js";

const execFileAsync = promisify(execFile);

test("parses repeatable stream IDs and manifest options", () => {
  const parsed = parseArgs([
    "manifests",
    "--stream-id",
    "100",
    "--stream-id=200",
    "--days",
    "7",
    "--mode",
    "count",
  ]);
  assert.deepEqual(parsed.positional, ["manifests"]);
  assert.deepEqual(parsed.options.streamIds, ["100", "200"]);
  assert.equal(parsed.options.days, "7");
  assert.equal(parsed.options.mode, "count");
});

test("parses hosted billing options", () => {
  const parsed = parseArgs(["billing", "checkout", "--plan", "individual", "--cycle", "annual", "--open"]);
  assert.deepEqual(parsed.positional, ["billing", "checkout"]);
  assert.equal(parsed.options.plan, "individual");
  assert.equal(parsed.options.cycle, "annual");
  assert.equal(parsed.options.open, true);
});

test("parses billing portal and status subcommands", () => {
  const portal = parseArgs(["billing", "portal", "--open"]);
  assert.deepEqual(portal.positional, ["billing", "portal"]);
  assert.equal(portal.options.open, true);

  const status = parseArgs(["billing", "status"]);
  assert.deepEqual(status.positional, ["billing", "status"]);
  assert.deepEqual(status.options, { streamIds: [] });
});

test("parses connect format and save flag", () => {
  const parsed = parseArgs(["connect", "--format", "md", "--save"]);
  assert.deepEqual(parsed.positional, ["connect"]);
  assert.equal(parsed.options.format, "md");
  assert.equal(parsed.options.save, true);
});

test("parses stream-search query positionals and options", () => {
  const parsed = parseArgs(["stream-search", "AI", "infrastructure", "--page-size", "10", "--token", "abc"]);
  assert.deepEqual(parsed.positional, ["stream-search", "AI", "infrastructure"]);
  assert.equal(parsed.options["page-size"], "10");
  assert.equal(parsed.options.token, "abc");
});

test("parseArgs rejects unknown options", () => {
  assert.throws(() => parseArgs(["profile", "--bogus"]), /Unknown option --bogus/);
});

test("parseArgs requires a value for options that expect one", () => {
  assert.throws(() => parseArgs(["manifests", "--days"]), /Option --days requires a value/);
});

test("requestJson sends bearer credentials only in Authorization", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await requestJson("https://api.example.test/account", {
      token: "secret-token",
    });
    assert.deepEqual(result, { ok: true });
    assert.equal(request.url, "https://api.example.test/account");
    assert.equal(request.init.headers.Authorization, "Bearer secret-token");
    assert.equal(request.url.includes("secret-token"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestJson throws with status and payload on a non-2xx response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  try {
    await assert.rejects(
      requestJson("https://api.example.test/missing", { token: "secret-token" }),
      (error) => {
        assert.match(error.message, /HTTP 404/);
        assert.equal(error.status, 404);
        assert.deepEqual(error.payload, { error: "not found" });
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the executable exposes help and version without network access", async () => {
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  const help = await execFileAsync(process.execPath, ["src/cli.js", "--help"], { cwd });
  assert.match(help.stdout, /synorb connect/);
  assert.match(help.stdout, /stream-search/);
  const version = await execFileAsync(process.execPath, ["src/cli.js", "--version"], { cwd });
  assert.equal(version.stdout.trim(), "0.1.1");
});
