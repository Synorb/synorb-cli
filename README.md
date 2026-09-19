# synorb-cli

[![npm version](https://img.shields.io/npm/v/%40synorb%2Fcli.svg)](https://www.npmjs.com/package/@synorb/cli)
[![CI](https://github.com/Synorb/synorb-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/Synorb/synorb-cli/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/%40synorb%2Fcli.svg)](LICENSE)

Command-line client for the [Synorb](https://synorb.com) REST API. It uses
the same bearer credential and JSON contracts as the
[Synorb REST API](https://synorb.com/openapi.json), so anything you can do
over HTTP you can do from this CLI.

## Install

```bash
npm install -g @synorb/cli
```

Requires Node 18.17 or later.

## Quickstart

```bash
synorb connect --save
synorb profile
synorb stream-search "AI infrastructure"
synorb manifests --stream-id 17810211877157441 --days 7
synorb billing checkout --plan individual --cycle monthly --open
synorb billing status
```

`connect` provisions or returns a Synorb Key through the public `/connect`
contract. `--save` stores it at `~/.config/synorb/config.json` with mode
`0600`. In CI, skip `--save` and set `SYNORB_TOKEN` instead.

The CLI only ever sends credentials in the `Authorization: Bearer` header —
never in a URL or query string. Billing commands create a hosted Stripe
Checkout or Billing Portal session and can open the returned HTTPS URL in
your browser. The account owner confirms payment in Stripe; a checkout URL
by itself is not proof of payment, and entitlement only activates once the
Stripe webhook has been verified.

## Usage

```
synorb connect [--format json|md] [--save]
synorb profile [--token TOKEN]
synorb stream-search QUERY [--page-size N] [--token TOKEN]
synorb manifests [options] [--token TOKEN]
synorb billing checkout --plan PLAN [--cycle monthly|annual] [--open]
synorb billing portal [--open]
synorb billing status
```

Global options:

```
--api-url URL       REST API base URL (default: SYNORB_API_URL or api.synorb.com)
--site-url URL      Provisioning site URL (default: SYNORB_SITE_URL or synorb.com)
--token TOKEN       Synorb Key (default: SYNORB_TOKEN or saved config)
--pretty            Pretty-print JSON output
--open              Open a returned hosted Stripe URL in the default browser
--help              Show help
--version           Show the CLI version
```

Manifest options:

```
--stream-id ID      Repeatable explicit stream scope
--query TEXT        Natural-language query
--days N            Relative lookback window
--mode MODE         default, count, orient, or plan (default: default)
--page-size N       Page size (default: 25)
```

Billing options:

```
--plan PLAN         individual, professional, or startup
--cycle CYCLE       monthly or annual (default: monthly)
```

## Examples

### Find a stream, then pull its recent manifests

```bash
$ synorb connect --save
{"token":"<synorb_key>","api_url":"https://api.synorb.com"}

$ synorb stream-search "AI infrastructure" --pretty
{
  "results": [
    { "stream_id": "17810211877157441", "name": "AI Infrastructure & Chips", "story_type": "briefs" }
  ]
}

$ synorb manifests --stream-id 17810211877157441 --days 7 --pretty
{
  "manifests": [
    { "manifest_id": "...", "story_id": "...", "published_date": "2026-09-15T14:02:00Z" }
  ],
  "count": 1
}
```

`stream-search` does not consume any query quota — use it first to find the
right `stream-id` before spending a `manifests` call. Add `--mode count` to
check result volume before pulling full records:

```bash
synorb manifests --stream-id 17810211877157441 --days 7 --mode count
```

### Set up billing from the terminal

```bash
$ synorb billing checkout --plan individual --cycle monthly --open
{"checkout_url":"https://checkout.stripe.com/c/pay/..."}

# complete the checkout in the browser tab that opened, then:
$ synorb billing status
{"plan":"individual","status":"active"}
```

## Documentation

- CLI reference: https://synorb.com/docs/cli
- REST API / OpenAPI schema: https://synorb.com/openapi.json
- Homepage: https://synorb.com

## Source

This CLI is developed as part of the [Synorb](https://synorb.com) platform.
The source in this repository is kept in sync with the internal monorepo by
an automated workflow on every change; issues and pull requests are welcome
here.

## License

MIT — see [LICENSE](LICENSE).
