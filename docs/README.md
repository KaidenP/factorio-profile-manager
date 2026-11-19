# Factorio Profile Manager — Documentation

This directory contains the documentation for **Factorio Profile Manager (FPM)**, a
launcher for [Factorio](https://factorio.com) that lets you manage multiple game
profiles, each with its own saves, mods, and settings.

## Contents

| Document | What it covers |
| --- | --- |
| [Overview](overview.md) | What the project is, its features, and its technology stack. |
| [Architecture](architecture.md) | Project layout, components, data model, and core flows (install, launch, profile lifecycle). |
| [Development](development.md) | Prerequisites, setup, build/run commands, and how the pieces fit together. |
| [User Guide](user-guide.md) | End-user usage: installing Factorio, creating/duplicating/deleting profiles, and launching. |
| [Releasing](releasing.md) | CI/CD workflows, versioning, and the Windows installer. |

## Quick facts

- **Language / runtime:** JavaScript (ES modules), bundled with [webpack](https://webpack.js.org/).
- **Desktop framework:** [Neutralino.js](https://neutralino.js.org/) `6.4.0` (uses the OS webview and a native API bridge).
- **Package manager:** [Yarn](https://yarnpkg.com/).
- **Zip extraction:** [`unzipit`](https://www.npmjs.com/package/unzipit).
- **Installer:** [Inno Setup](https://jrsoftware.org/isinfo.php) (`setup.iss`).
- **Platform target:** Windows (the app shell, launch path, and installer are Windows-specific).
- **License:** [MIT](../LICENSE).
