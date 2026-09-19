# AGENTS.md

Instructions for AI coding agents working in this repository.

## What this repo is

This repo (`Synorb/synorb-cli`) holds the source for `@synorb/cli`, the
command-line client for the Synorb REST API. It is small on purpose: one
executable, no build step, no framework, no runtime dependencies outside
Node's standard library.

## This repo is a synced mirror

Real development happens in a private monorepo (`Synorb/synorb-v3`, under
`cli/`). A GitHub Action pushes one standardized commit to this repo's
`main` branch whenever that upstream path changes. Commit history here is
generated, not authored by hand — don't expect it to follow normal commit
conventions, and don't try to rebase, squash, or rewrite it.

Because of this:

- Small fixes (README wording, typos, doc corrections) are fine to submit
  as PRs directly against this repo.
- Changes to behavior — `src/cli.js`, `test/cli.test.js`, or `package.json`
  scripts/dependencies — should not be merged here directly. Open the PR so
  the diff is visible and reviewable, but say in the description that it
  needs to land in the upstream monorepo instead. A change merged only here
  will be silently overwritten by the next sync.

## Running tests

Confirm the command in `package.json` rather than assuming one. Currently:

```bash
npm test
```

which runs `node --test` (`test/cli.test.js`). Requires Node 18.17 or newer
(see the `engines` field in `package.json`). No separate lint or build step
exists. The suite needs no network access: `requestJson` is tested against a
stubbed `fetch`, and the executable is invoked directly with `--help` and
`--version` rather than a live command.

## Code style

- Plain ES modules (`"type": "module"` in `package.json`). No TypeScript, no
  bundler, no framework.
- Everything lives in `src/cli.js`. Its only imports are Node core modules
  (`node:fs/promises`, `node:child_process`, `node:os`, `node:path`,
  `node:url`) plus the global `fetch`.
- Match existing formatting — 2-space indent, double quotes, semicolons —
  rather than introducing a formatter or config.

## Adding a subcommand

1. If the command takes a flag with a value, add its name to the
   `expectsValue` set in `parseArgs` (`src/cli.js`).
2. Add a branch for the command in `run()`, following the pattern of the
   existing commands (`profile`, `stream-search`, `manifests`, `billing`).
   Every command except `connect` requires a resolved token — see the check
   just before the `billing` branch.
3. Update the `HELP` string with the new usage line and, if relevant, a new
   options section.
4. Update the Quickstart section in `README.md`.
5. Add a test in `test/cli.test.js` covering argument parsing at minimum.

Send the change upstream to the monorepo (see above) rather than opening a
direct PR against `src/cli.js` in this repo.

## Credential handling

The CLI sends a Synorb Key only in the `Authorization: Bearer` header. It
never appends a token to a URL or query string. If you add a command that
calls the API, follow the existing pattern in `requestJson`. Don't log
tokens, and don't write a token anywhere other than
`~/.config/synorb/config.json` (via `saveToken`, file mode 0600).
