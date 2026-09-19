# Contributing

## About this repository

This repository mirrors the `cli/` directory of Synorb's private monorepo.
It is kept in sync automatically on every change to that directory. Source
changes have to land in the private monorepo first, then flow here — a pull
request opened directly against this repo cannot be merged as-is.

If you want to propose a change, open an issue or start a discussion first.
That lets us confirm the approach before any code moves, and route the
actual change through the upstream repository.

## Local development

Requires Node.js 18.17 or later.

```bash
git clone https://github.com/Synorb/synorb-cli.git
cd synorb-cli
npm install
node src/cli.js --help
```

## Running tests

```bash
npm test
```

This runs `node --test`.

## Reporting bugs

Use the bug report issue template and include the CLI version
(`synorb --version`), your OS, and steps to reproduce.

## Security issues

Do not open an issue for security vulnerabilities. See `SECURITY.md`.
