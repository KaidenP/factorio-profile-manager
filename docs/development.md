# Development Guide

## Prerequisites

- **Windows** — the app shell, run script, and launch path are Windows-specific.
- **Node.js** and **Yarn** — dependency management and builds.
- Neutralino.js binaries — fetched by the `neu` CLI (see below).

> The `neu` CLI and the Neutralino binary are pulled in as dev dependencies /
> by the `neu update` step, so they are not committed to the repo.

## First-time setup

```bash
yarn run init
```

This runs:

```bash
yarn install
node ./node_modules/@neutralinojs/neu/bin/neu.js update
mkdir workspace
```

- `yarn install` installs dependencies.
- `neu update` downloads the Neutralino client/binary versions pinned in
  `neutralino.config.json` (`6.4.0`) into `bin/`.
- `mkdir workspace` creates the `workspace/` directory used by the dev run
  script.

## Available scripts

From `package.json`:

| Command | What it does |
| --- | --- |
| `yarn run init` | Install deps, update Neutralino binaries, create `workspace/`. |
| `yarn run build` | Bundle with webpack, then `neu build --release` into `dist/`. |
| `yarn run run` | Bundle, then launch the Neutralino binary from `workspace/` in dev mode. |
| `yarn run watch` | Run webpack in watch mode (rebuild on source changes). |

## Building

```bash
yarn run build
```

1. webpack bundles `src/app.js` (and its imports) into
   `resources/js/build/app.bundle.js`.
2. `neu build --release` packages the app into
   `dist/factorio-profile-manager/`.

The build also produces the `resources.neu` bundle and the
`factorio-profile-manager-win_x64.exe` launcher used by the installer.

## Running in development

```bash
yarn run run
```

1. webpack builds the bundle.
2. Neutralino is launched from `workspace/` with the dev flags
   `--load-dir-res --path=.. --export-auth-info --neu-dev-extension --neu-dev-auto-reload`.

Note: the run script expects the Neutralino Windows binary at
`bin/neutralino-win_x64.exe` (created by `neu update`).

## Webpack

`webpack.config.js` is minimal:

- **mode:** `development`
- **entry:** `./src/app.js`
- **output:** `resources/js/build/app.bundle.js`
- **devtool:** `source-map`

Because the entry is `src/app.js`, the UI modules and utilities are bundled in
via ES module imports. There is no separate build step for CSS/HTML — those are
served directly from `resources/`.

## Where things live

- **UI markup:** `resources/index.html` — contains the table, footer buttons, and
  the modal templates (`addProfileModal`, `loadingModal`, `infoModal`).
- **Styles:** `resources/styles.css` → `resources/css/*.css`.
- **Application logic:** `src/app.js` (see [Architecture](architecture.md)).
- **Factorio integration:** `src/factorio.js`.
- **UI behavior:** `src/ui/*.js`.
- **Helpers:** `src/util/*.js` and `src/queueWorker.js`.

## Editing workflow

- After editing `src/**`, either run `yarn run watch` (to rebuild continuously)
  or run `yarn run run` to rebuild and launch.
- `neu build` packages everything into `dist/`, but during development the app
  loads `resources/` directly (via `--load-dir-res`), so HTML/CSS edits are
  picked up without a webpack rebuild; JS edits require a webpack rebuild.

## Useful Neutralino APIs in this project

The code interacts with Neutralino through `@neutralinojs/lib`:

- `Neutralino.init()` — initialize the bridge.
- `Neutralino.storage.getData` / `setData` — profile metadata persistence.
- `Neutralino.filesystem.*` — directory creation, copy, remove, read/write,
  binary reads/writes, stats, path joins.
- `Neutralino.os.*` — `showOpenDialog`, `open`, `getPath`, `execCommand`.
- `Neutralino.resources.readFile` — read bundled resources (e.g. the default
  Factorio config).
- `Neutralino.window.setDraggableRegion` — the custom title-bar grip.
- `Neutralino.app.exit` — quit the app.

See the
[Neutralino.js API docs](https://neutralino.js.org/docs/api/overview) for details.
