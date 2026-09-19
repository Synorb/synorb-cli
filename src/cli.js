#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Keep in sync with package.json's "version" — nothing enforces this automatically.
const VERSION = "0.1.2";
const DEFAULT_SITE_URL = "https://synorb.com";
const DEFAULT_API_URL = "https://api.synorb.com";

const HELP = `Synorb CLI ${VERSION}

Command-line access to Synorb's agent API and hosted billing handoffs.

Usage:
  synorb connect [--format json|md] [--save]
  synorb profile [--token TOKEN]
  synorb stream-search QUERY [--page-size N] [--token TOKEN]
  synorb manifests [options] [--token TOKEN]
  synorb billing checkout --plan PLAN [--cycle monthly|annual] [--open]
  synorb billing portal [--open]
  synorb billing status

Global options:
  --api-url URL       REST API base URL (default: SYNORB_API_URL or api.synorb.com)
  --site-url URL      Provisioning site URL (default: SYNORB_SITE_URL or synorb.com)
  --token TOKEN       Synorb Key (default: SYNORB_TOKEN or saved config)
  --pretty            Pretty-print JSON output
  --open              Open a returned hosted Stripe URL in the default browser
  --help              Show this help
  --version           Show the CLI version

Manifest options:
  --stream-id ID      Repeatable explicit stream scope
  --query TEXT        Natural-language query
  --days N            Relative lookback window
  --mode MODE         default, count, orient, or plan (default: default)
  --page-size N       Page size (default: 25)

Billing options:
  --plan PLAN         individual, professional, or startup
  --cycle CYCLE       monthly or annual (default: monthly)

Examples:
  synorb connect --save
  synorb profile
  synorb stream-search "AI infrastructure"
  synorb manifests --stream-id 17810211877157441 --days 7

Credentials are sent only in the Authorization header. The CLI never puts a
Synorb Key in a URL or forwards it to the site provisioning endpoint after it
has been obtained. Billing opens a hosted Stripe page for explicit account-
owner confirmation; a checkout URL is not proof that payment succeeded.`;

function fail(message, details) {
  const payload = { error: message };
  if (details !== undefined) payload.details = details;
  process.stderr.write(`${JSON.stringify(payload)}\n`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const positional = [];
  const options = { streamIds: [] };
  const expectsValue = new Set([
    "api-url",
    "site-url",
    "token",
    "format",
    "page-size",
    "stream-id",
    "query",
    "days",
    "mode",
    "plan",
    "cycle",
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [rawName, inlineValue] = arg.slice(2).split("=", 2);
    if (rawName === "help" || rawName === "version" || rawName === "pretty" || rawName === "save" || rawName === "open") {
      options[rawName] = true;
      continue;
    }
    if (!expectsValue.has(rawName)) throw new Error(`Unknown option --${rawName}`);
    const value = inlineValue ?? argv[++i];
    if (!value || value.startsWith("--")) throw new Error(`Option --${rawName} requires a value`);
    if (rawName === "stream-id") options.streamIds.push(value);
    else options[rawName] = value;
  }
  return { positional, options };
}

function cleanBaseUrl(value, fallback) {
  return String(value || fallback).trim().replace(/\/+$/, "");
}

function configPath() {
  return join(homedir(), ".config", "synorb", "config.json");
}

async function savedConfig() {
  try {
    return JSON.parse(await readFile(configPath(), "utf8"));
  } catch {
    return {};
  }
}

async function resolveToken(options) {
  if (options.token) return options.token;
  if (process.env.SYNORB_TOKEN) return process.env.SYNORB_TOKEN;
  return (await savedConfig()).token || "";
}

function print(value, pretty) {
  if (typeof value === "string") process.stdout.write(`${value.endsWith("\n") ? value : `${value}\n`}`);
  else process.stdout.write(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);
}

async function requestJson(url, { method = "GET", token = "", body } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(`Synorb API returned HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function saveToken(token, apiUrl) {
  const path = configPath();
  await mkdir(join(homedir(), ".config", "synorb"), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify({ token, api_url: apiUrl }, null, 2)}\n`, { mode: 0o600 });
  return path;
}

async function openUrl(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Refusing to open a non-HTTPS hosted billing URL");
  const command = process.platform === "win32" ? "cmd.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", parsed.href] : [parsed.href];
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", resolve);
    child.unref();
  });
}

async function run(argv) {
  const { positional, options } = parseArgs(argv);
  if (options.version) {
    print(VERSION, false);
    return;
  }
  if (options.help || positional.length === 0) {
    print(HELP, false);
    return;
  }

  const command = positional[0];
  const apiUrl = cleanBaseUrl(options["api-url"] || process.env.SYNORB_API_URL, DEFAULT_API_URL);
  const siteUrl = cleanBaseUrl(options["site-url"] || process.env.SYNORB_SITE_URL, DEFAULT_SITE_URL);
  const token = await resolveToken(options);
  const pretty = Boolean(options.pretty);

  if (command === "connect") {
    const format = options.format || "json";
    if (!new Set(["json", "md"]).has(format)) throw new Error("--format must be json or md");
    const result = await requestJson(`${siteUrl}/connect?format=${encodeURIComponent(format)}`);
    if (options.save) {
      if (format !== "json" || !result?.credentials?.synorb_key) {
        throw new Error("--save requires JSON connect output containing credentials.synorb_key");
      }
      const path = await saveToken(result.credentials.synorb_key, apiUrl);
      result.saved_config = path;
    }
    print(result, pretty);
    return;
  }

  if (!token) throw new Error("No Synorb Key. Run `synorb connect --save` or set SYNORB_TOKEN.");
  if (command === "billing") {
    const action = positional[1];
    if (action === "checkout") {
      const plan = options.plan;
      const cycle = options.cycle || "monthly";
      if (!["individual", "professional", "startup"].includes(plan)) {
        throw new Error("billing checkout requires --plan individual, professional, or startup");
      }
      if (!["monthly", "annual"].includes(cycle)) throw new Error("--cycle must be monthly or annual");
      const result = await requestJson(`${apiUrl}/api/billing/checkout-session`, {
        method: "POST",
        token,
        body: { target_plan: plan, billing_cycle: cycle },
      });
      if (options.open && result?.checkout_url) await openUrl(result.checkout_url);
      print(result, pretty);
      return;
    }
    if (action === "portal") {
      const result = await requestJson(`${apiUrl}/api/billing/portal-session`, { method: "POST", token });
      if (options.open && result?.portal_url) await openUrl(result.portal_url);
      print(result, pretty);
      return;
    }
    if (action === "status") {
      print(await requestJson(`${apiUrl}/subscription`, { token }), pretty);
      return;
    }
    throw new Error("billing requires checkout, portal, or status. Run synorb --help.");
  }
  if (command === "profile") {
    print(await requestJson(`${apiUrl}/account`, { token }), pretty);
    return;
  }
  if (command === "stream-search") {
    const query = positional.slice(1).join(" ") || options.query;
    if (!query) throw new Error("stream-search requires a query");
    const pageSize = Number(options["page-size"] || 20);
    print(await requestJson(`${apiUrl}/streams/search`, { method: "POST", token, body: { query, page_size: pageSize } }), pretty);
    return;
  }
  if (command === "manifests") {
    const mode = options.mode || "default";
    if (!["default", "count", "orient", "plan"].includes(mode)) throw new Error("--mode must be default, count, orient, or plan");
    const body = { mode, page_size: Number(options["page-size"] || 25) };
    if (options.streamIds.length) body.stream_ids = options.streamIds;
    if (options.query) body.query = options.query;
    if (options.days !== undefined) body.days = Number(options.days);
    print(await requestJson(`${apiUrl}/manifests/query`, { method: "POST", token, body }), pretty);
    return;
  }
  throw new Error(`Unknown command: ${command}. Run synorb --help.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).catch((error) => fail(error.message, error.payload));
}

export { HELP, parseArgs, requestJson, run };
