---
id: synorb-cli-usage
name: Synorb CLI usage
description: How to use the @synorb/cli command-line tool to authenticate, search streams, and query manifests against the Synorb REST API.
---

# Synorb CLI usage

`synorb` is the command-line client for the Synorb REST API. Install:

```bash
npm install -g @synorb/cli
```

Requires Node 18.17 or newer. Source: https://github.com/Synorb/synorb-cli

## Authenticate

```bash
synorb connect --save
```

This calls the public `/connect` endpoint, provisions or returns a Synorb
Key, and — with `--save` — writes it to `~/.config/synorb/config.json`
(file mode 0600). Without `--save`, `connect` prints the result without
storing anything.

`--format json|md` controls the response format (default `json`). `--save`
requires the default `json` format, since it reads
`credentials.synorb_key` from the response.

In CI, skip `connect` and set the `SYNORB_TOKEN` environment variable
instead. Every other command resolves its token in this order: `--token`
flag, then `SYNORB_TOKEN`, then the saved config file.

Credentials are sent only in the `Authorization: Bearer` header, never in a
URL or query string.

## Check the account

```bash
synorb profile
```

Requires a token (see Authenticate). Returns the account tied to the
current Synorb Key.

## Search streams

```bash
synorb stream-search "AI infrastructure"
synorb stream-search "AI infrastructure" --page-size 10
```

The query is given as trailing positional words, or via `--query`.
`--page-size` defaults to 20.

## Query manifests

```bash
synorb manifests --stream-id 17810211877157441 --days 7
synorb manifests --query "semiconductor export controls" --mode count
```

Options:

- `--stream-id ID` — repeatable, explicit stream scope
- `--query TEXT` — natural-language query
- `--days N` — relative lookback window
- `--mode default|count|orient|plan` — default `default`
- `--page-size N` — default 25

## Billing

```bash
synorb billing checkout --plan individual --cycle monthly --open
synorb billing portal --open
synorb billing status
```

`checkout` requires `--plan individual|professional|startup`; `--cycle` is
`monthly` or `annual` (default `monthly`). `--open` opens the returned
hosted Stripe URL in the default browser. A checkout URL is not proof of
payment — entitlement activates only once the Stripe webhook confirms it.

## Global options

Available on every command:

- `--api-url URL` — REST API base (default: `SYNORB_API_URL` env var, else
  `https://api.synorb.com`)
- `--site-url URL` — provisioning site base, used by `connect` (default:
  `SYNORB_SITE_URL` env var, else `https://synorb.com`)
- `--token TOKEN` — Synorb Key (default: `SYNORB_TOKEN` env var, else saved
  config)
- `--pretty` — pretty-print JSON output
- `--open` — open a returned hosted Stripe URL in the default browser
- `--help` — show usage
- `--version` — show the CLI version

## Notes for agents

- Output is JSON on stdout by default (or Markdown, for
  `connect --format md`). Errors are JSON on stderr with a non-zero exit
  code, shaped `{"error": "..."}`.
- Every command except `connect` fails with `No Synorb Key. Run
  \`synorb connect --save\` or set SYNORB_TOKEN.` if no token is available.
- The full flag reference is also available at any time via `synorb --help`.
