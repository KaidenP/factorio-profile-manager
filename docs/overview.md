# Overview

Factorio Profile Manager (FPM) is a lightweight desktop launcher for
[Factorio](https://factorio.com). Instead of managing a single Factorio
installation by hand, FPM lets you define multiple **profiles**, each of which
gets its own isolated Factorio data directory (saves, mods, settings, etc.).

FPM ships as a Neutralino.js desktop app. It is intentionally small: there is no
Electron runtime, no embedded web server for the UI, and no database. The UI is
plain HTML/CSS/JS rendered in the OS webview, and all desktop capabilities
(filesystem access, opening files, launching processes) go through the
Neutralino native API bridge.

## What it does

- Manages a list of named profiles with per-profile usage stats (last run, total runs).
- Creates a separate data directory on disk for each profile.
- Points Factorio's `write-data` path at the selected profile before launching,
  so saves, mods, and settings stay isolated per profile.
- Duplicates an existing profile by copying its directory.
- Detects whether Factorio is installed; if not, walks the user through
  selecting the official Factorio ZIP and extracts it with a progress UI.

## Feature status

From the project `README.md`:

- [x] Clean UI
- [ ] Automatic downloads of the latest Factorio version
- [ ] Mod list
- [ ] One copy of the game for all profiles

The "Installed Mods" panel in the UI currently shows mock data and is labeled
*"Not Implemented"*. See [Architecture](architecture.md) for where these features
would hook in.

## Technology stack

| Concern | Technology |
| --- | --- |
| App shell / native APIs | [Neutralino.js](https://neutralino.js.org/) `6.4.0` (`@neutralinojs/lib` for the JS API) |
| UI | HTML + CSS in `resources/`, vanilla JavaScript |
| Bundling | [webpack](https://webpack.js.org/) 5 (entry `src/app.js` → `resources/js/build/app.bundle.js`) |
| Zip extraction | [`unzipit`](https://www.npmjs.com/package/unzipit) 1.4.x |
| Build orchestration | `@neutralinojs/neu` CLI + npm scripts |
| Package manager | [Yarn](https://yarnpkg.com/) (`yarn.lock`) |
| Windows installer | [Inno Setup](https://jrsoftware.org/isinfo.php) (`setup.iss`) |
| CI/CD | GitHub Actions (`.github/workflows/`) |

## Platform scope

The project targets **Windows**:

- The launch path uses `factorio.exe` and `cmd /c start`.
- The Neutralino run script references `bin/neutralino-win_x64.exe`.
- The installer (`setup.iss`) is Windows-only.

The Factorio `config.ini` handling and the bundled default configuration also use
Windows-style paths (`\` separators).
