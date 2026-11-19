# Releasing & CI/CD

Builds and releases are handled by GitHub Actions on Windows runners.

## Workflows

### `.github/workflows/push.yaml` — nightly builds

Trigger: every push to any branch.

Steps:

1. Checkout the repository.
2. Delete the existing `nightly` GitHub release and tag (best-effort, using `gh`
   and `git`).
3. Set up Node.js with Yarn caching.
4. `yarn run init` — install deps and update Neutralino binaries.
5. `yarn run build` — webpack + `neu build --release`.
6. Build the Inno Setup installer via `Minionguyjpro/Inno-Setup-Action`.
7. Create a prerelease named **"Most Recent Commit"** tagged `nightly`.
8. Upload two assets:
   - `Factorio Profile Manager Setup.exe`
   - `Factorio Profile Manager Portable.zip`

The release body links to the triggering commit and branch and includes the
commit message.

### `.github/workflows/release.yaml` — tagged releases

Trigger: push of a tag matching `v*` (e.g. `v2.0.0`).

Steps mirror the nightly workflow but:

- The release is a **stable** (non-prerelease) release.
- It uses the tag name (`${{ github.ref_name }}`) for the tag and release name
  (`Release <tag>`).
- No nightly tag/release deletion.

## Versioning

- The version lives in two places that should be kept in sync:
  - `package.json` → `"version"`
  - `neutralino.config.json` → `"version"`
- `setup.iss` also carries `AppVersion` (currently `2.0.0`).
- Stable releases are cut by pushing a `v*` tag.

To cut a release:

```bash
git tag v2.0.1
git push origin v2.0.1
```

The `release.yaml` workflow builds and publishes the artifacts.

## Build artifacts

| Artifact | Source |
| --- | --- |
| `dist/factorio-profile-manager/` | `neu build --release` output (contains `resources.neu` and the Windows launcher). |
| `dist/Factorio Profile Manager Setup.exe` | Inno Setup build of `setup.iss`. |
| `dist/factorio-profile-manager-release.zip` | Portable build (created by the Neutralino release build). |

## The installer (`setup.iss`)

`setup.iss` is an Inno Setup script:

- `AppName`: Factorio Profile Manager, `AppId`: FPM.
- Installs to `{localappdata}\FPM\`.
- `PrivilegesRequired=lowest` — per-user install, no admin rights.
- Ships the built `factorio-profile-manager-win_x64.exe`, `resources.neu`
  (hidden), and the app icon.
- Creates a Start Menu group and an optional desktop icon (`desktopicon` task).
- Creates the `data` directory under the install directory.
- `[Run]` offers to launch FPM after install.
- The uninstaller (`InitializeUninstall`) asks whether to also delete all
  application data.

## Local release build

On Windows, after `yarn run init`:

```bash
yarn run build
```

then build the installer with Inno Setup (or the
`Minionguyjpro/Inno-Setup-Action` equivalent) using `setup.iss`.

## Notes

- The workflows use `actions/create-release@v1` and
  `actions/upload-release-asset@v1`, which are legacy actions but still
  functional for this project.
- Both workflows assume the assets land at the paths above; if the Neutralino
  release output layout changes, the `asset_path` values must be updated.
