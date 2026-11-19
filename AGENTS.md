# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Factorio Profile Manager (FPM) is a Windows desktop app that manages multiple
independent Factorio profiles. Each profile is a separate `write-data` directory,
so different mod sets, saves, and settings can be launched in isolation.

It is built on **Neutralino.js** (a lightweight WebView2 runtime) — not
Electron. There is no Node/Express backend; the UI calls Neutralino's native API
through `window.Neutralino`.

## Stack

- Neutralino.js `6.4.0` (`@neutralinojs/neu` CLI, `@neutralinojs/lib` client)
- Vanilla JavaScript (no framework) + Webpack 5 (`resources/js/build/app.bundle.js`)
- Yarn (v1) for dependencies
- Inno Setup **7** (`setup.iss`) for the Windows installer
- `unzipit` — fallback ZIP extractor only (see extraction note below)

## Commands

```bash
yarn install                  # or: yarn run init (also fetches neutralino binaries)
yarn run build                # webpack + neu build --release  -> dist/
yarn run run                  # dev mode (webpack + neutralino)
yarn run watch                # webpack --watch
ISCC.exe setup.iss            # build installer -> dist/Factorio Profile Manager Setup.exe
```

`ISCC.exe` lives at `C:\Program Files\Inno Setup 7\ISCC.exe`.

## Layout

- `src/app.js` — `Application` class: profile CRUD, storage, launch flow
- `src/factorio.js` — Factorio detection (`detect()`/`checkInstalled()`), install, launch
- `src/util/zip.js` — extraction (native `tar` + JS fallback)
- `src/util/util.js` — `ensureDirectory()`
- `src/queueWorker.js` — concurrency-limited task queue (JS extraction fallback)
- `src/ui/` — dialog, loading modal, table, window chrome
- `resources/` — `index.html`, CSS, icons, `factorioDefault.ini`
- `neutralino.config.json` — native API allowlist, window mode, `dataLocation: "./"`
- `setup.iss` — Inno Setup script
- `.github/workflows/push.yaml` / `release.yaml` — CI/release

## Data layout (relative to the app's working directory)

- `factorio/` — extracted game (`bin/x64/factorio.exe`, `config/`, `data/`, …)
- `profile/<id>/` — a profile's `write-data` directory
- `.storage/` — Neutralino key-value storage (`profile_data`)
- `config-path.cfg` / `factorio/config/config.ini` — Factorio config discovery

`dataLocation` is `./`, so the working directory **is** the data root. The app is
always launched with its working directory set to the install dir
(`%LOCALAPPDATA%\FPM`). Do not run it from the repo root.

## Gotchas that matter

### 1. Line endings: LF only
Committed files use LF. Windows tools (and sometimes the app itself) introduce
CRLF; a `git status` full of "modified" files with no real diff is usually CRLF
noise. **Never commit line-ending-only changes.** Strip CRs before committing:
`sed -i 's/\r$//' <file>`.

### 2. Neutralino's binary bridge is slow
`filesystem.readBinaryFile` / `writeBinaryFile` / `appendBinaryFile` move bytes
as base64 over a WebSocket (~5 MB/s). For anything large, prefer a native
process. This is why `src/util/zip.js` extracts Factorio with the Windows-bundled
`tar` (bsdtar) via `Neutralino.os.execCommand` instead of `unzipit`. Keep
`unzipit` as the fallback only.

### 3. `os.execCommand` wraps the command in `cmd.exe /c "..."`
On Windows the native layer prepends `cmd.exe /c "` and appends `"`. Nested
quoting is fragile — avoid spaces/special chars in the command. When paths may
contain spaces, copy to a space-free temp path first (see `extractWithTar`).
`{ background: false }` **blocks the native core** for the whole duration; use it
only when no other native calls are needed during the command.

### 4. Factorio detection must be re-run after extraction
`checkInstalled()`/`detect()` set `Factorio.path`. They run once at startup.
After a fresh extraction, `detect()` must be called again (done in
`src/factorio.js` `install()`), otherwise `launch()` runs
`cmd /c start "" "null"`.

### 5. Don't touch `%APPDATA%\factorio`
That directory holds the user's standalone Factorio saves/config — it is **not**
FPM data. FPM data lives only under its working directory (`factorio/`,
`profile/`, `.storage/`).

### 6. DevTools debug port
`neutralino.config.json` sets `enableInspector: true` and
`webviewArgs` with `--remote-debugging-port=9222`, so `http://127.0.0.1:9222/json`
exposes a Chrome DevTools WebSocket for inspecting the running UI.

## Releases

- `push.yaml` — on every branch push: builds, then deletes and recreates the
  `nightly` prerelease with fresh artifacts.
- `release.yaml` — on `v*` tag push: builds and publishes a versioned release.

Both upload:
- `dist/Factorio Profile Manager Setup.exe` (installer)
- `dist/factorio-profile-manager-release.zip` (portable)

### Version bump (all three together)
1. `package.json` → `"version"`
2. `setup.iss` → `AppVersion` and `AppVerName`
3. `neutralino.config.json` → `"version"`

Then tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
