# CodexCore Codespace Context

Last updated: 2026-03-15 UTC

## Snapshot

- Repo: `CodexCore`
- Commit: `4ac73476159d81e1742b4f05be6c90bb338b30eb`
- Commit subject: `Add mobile app and sync workspace updates`
- GitNexus index: fresh as of `2026-03-15T22:01:36.128Z`
- GitNexus graph: `41 files`, `152 nodes`, `351 edges`, `14 communities`, `20 processes`
- Primary languages present: TypeScript, JavaScript, Python, Markdown

## How To Sync Claude And ChatGPT Quickly

Give either assistant this file first, then also point it at:

- `AGENTS.md`
- `CLAUDE.md`
- `VoltAgentCore/AGENTS.md`

Minimal prompt:

```text
Use /workspaces/CodexCore/CODESPACE_CONTEXT.md as the current workspace snapshot.
Then use AGENTS.md and CLAUDE.md for repo rules.
Assume the repo root is /workspaces/CodexCore and commit 4ac73476159d81e1742b4f05be6c90bb338b30eb is the current HEAD.
```

## Top-Level Repo Map

- `.claude/skills/gitnexus/`: local GitNexus skill docs
- `.gitnexus/`: GitNexus index data
- `VoltAgentCore/`: TypeScript/Node app targeting VoltAgent/Vercel
- `codexcore/`: Python package with CLI/engine/registry modules
- `mobile/`: React/Vite mobile shell app
- `reports/`: generated HTML report artifacts
- `AGENTS.md`: repo instructions
- `CLAUDE.md`: generated repo context/instructions

## Project Summary

### `VoltAgentCore/`

- Node/TypeScript service
- Key source files:
  - `src/app.ts`
  - `src/index.ts`
  - `src/env.ts`
  - `src/sentry.ts`
  - `api/VoltAgent.ts`
- Build output present in `dist/`
- Runtime/data directory present in `voltagent/`
- Package scripts:
  - `dev`: `node --import tsx ./src/index.ts`
  - `build`: `tsdown --sourcemap`
  - `vercel-build`: `npm run build && npm run sentry:upload-sourcemaps`
  - `start`: `node --enable-source-maps dist/index.js`
  - `lint`: `biome check ./src`
  - `typecheck`: `tsc --noEmit`

### `mobile/`

- React 19 + Vite 8 app
- Main app files:
  - `src/App.jsx`
  - `src/App.css`
  - `src/gateway.js`
  - `src/config.js`
  - `src/main.jsx`
- App areas visible in code:
  - Home
  - Studio
  - Vault
  - Nodes
- Uses mocked/mobile-local gateway logic for runs, vault artifacts, and node telemetry
- Package scripts:
  - `dev`: `vite`
  - `build`: `vite build`
  - `lint`: `eslint .`
  - `preview`: `vite preview`

### `codexcore/`

- Python package
- Main modules:
  - `cli.py`
  - `engine.py`
  - `registry.py`
- Also contains `__init__.py`

## Database Files Present

- `VoltAgentCore/voltagent/memory.db`
- `VoltAgentCore/voltagent/observability.db`

No other `.db`, `.sqlite`, `.sqlite3`, `.mdb`, or `.sql` files were found in the workspace scan.

## Running Services / Processes Observed

Observed from process and port scans inside the Codespace:

- Codex CLI agent process is running
- VS Code remote server processes are running
- Docker daemon/container services are running in the Codespace container
- SSH daemon is listening

Listening ports observed:

- `2222`: SSH service
- `2000`: container-exposed service present, exact process mapping unavailable from sandboxed `ss`
- `127.0.0.53:53`: local DNS resolver
- several localhost-only ephemeral ports used by editor/runtime processes:
  - `12563`
  - `13005`
  - `16634`
  - `16635`
  - `34131`
  - `41543`

Notes:

- Port-to-process mapping was limited by sandbox permissions
- No dedicated app dev server was clearly identifiable from the visible process list at scan time

## Node Runtime Tools Present

- `node`: `v24.11.1`
- `npm`: `11.6.2`
- `npx`: `11.6.2`
- `pnpm`: `10.23.0`
- `yarn`: `1.22.22`

## Package Manifests Present

- Root `package.json`: only `@sentry/cli` in `devDependencies`
- `VoltAgentCore/package.json`: VoltAgent, Hono, Sentry, TypeScript toolchain
- `mobile/package.json`: React/Vite/ESLint toolchain

## Repo Tree At A Glance

```text
/workspaces/CodexCore
├── .claude/
├── .gitnexus/
├── AGENTS.md
├── CLAUDE.md
├── CODESPACE_CONTEXT.md
├── VoltAgentCore/
│   ├── api/
│   ├── dist/
│   ├── scripts/
│   ├── src/
│   └── voltagent/
├── codexcore/
├── mobile/
│   ├── public/
│   └── src/
├── reports/
├── package-lock.json
└── package.json
```

## High-Signal Summary

- This repo is a mixed workspace, not a single app
- `VoltAgentCore/` is the main TypeScript backend/service area
- `mobile/` is a newly added React/Vite mobile shell frontend
- `codexcore/` is a Python package with CLI/runtime components
- GitNexus indexing is installed and currently fresh for repo exploration
- Persistent local runtime data exists in the two DB files under `VoltAgentCore/voltagent/`

## Best Compression Strategy For Any Assistant

If token budget is tight, use this order:

1. Read `CODESPACE_CONTEXT.md`
2. Read `AGENTS.md`
3. Read `CLAUDE.md`
4. Read only the subproject manifest relevant to the task:
   - `VoltAgentCore/package.json`
   - `mobile/package.json`
   - or `codexcore/*.py`
5. Use GitNexus for symbol/process lookups instead of broad grep

## Caveats

- The process scan reflects a point-in-time snapshot on 2026-03-15 UTC
- Port `2000` was open, but the sandboxed scan could not attribute it to a process
- The GitNexus CLI available here exposed `status`, `analyze`, `impact`, `context`, and related commands, but not the `detect_changes` command referenced in some generated instructions
