# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-09-18

Initial public release of the `@synorb/cli` package.

### Added

- `synorb connect` — provision or return a Synorb Key via the public
  `/connect` contract, with `--save` to store it at
  `~/.config/synorb/config.json` (mode `0600`).
- `synorb profile` — fetch the authenticated account's profile.
- `synorb stream-search` — search available streams by natural-language
  query, with pagination via `--page-size`.
- `synorb manifests` — query manifests by stream id, natural-language
  query, or relative lookback window (`--days`), with `default`, `count`,
  `orient`, and `plan` modes.
- `synorb billing checkout` — create a hosted Stripe Checkout session for a
  plan and billing cycle, with `--open` to launch it in the browser.
- `synorb billing portal` — create a hosted Stripe Billing Portal session.
- `synorb billing status` — fetch current plan and subscription status.
- Global options: `--api-url`, `--site-url`, `--token`, `--pretty`,
  `--open`, `--help`, `--version`.
- Credential handling: tokens are read from `--token`, `SYNORB_TOKEN`, or
  the saved config, and are only ever sent via the `Authorization: Bearer`
  header — never in a URL or query string.
