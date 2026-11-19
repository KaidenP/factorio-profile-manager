# User Guide

Factorio Profile Manager (FPM) is a launcher that keeps multiple Factorio
profiles isolated from each other. Each profile has its own directory for saves,
mods, and settings.

## Installing FPM

Download the latest release from the
[Releases page](https://github.com/KaidenP/factorio-profile-manager/releases).
Two artifacts are published:

- **Factorio Profile Manager Setup.exe** — an Inno Setup installer.
- **Factorio Profile Manager Portable.zip** — a portable, no-install build.

The installer installs to `%LOCALAPPDATA%\FPM\` and optionally creates a Start
Menu group and desktop icon.

## First launch: installing Factorio

FPM needs a Factorio installation to launch. On startup it checks for Factorio
under its own `factorio/` directory.

If Factorio is not found, FPM shows a dialog that:

1. Links to <https://factorio.com/download>.
2. Asks you to download the **Factorio ZIP** distribution.
3. Prompts you to select that ZIP file.

FPM then extracts the ZIP (showing a progress bar) into its `factorio/`
directory. This can take a while for large archives.

> The ZIP distribution (not the installer) is required because FPM needs a
> portable copy it can point at per-profile data directories.

## Profiles

### Create a profile

1. Click **Add Profile** in the footer.
2. Enter a **Profile Name** (required).
3. Optionally enter a **Profile Directory Name** (the folder name on disk).
   If left blank, FPM generates one from the name.
4. Click **Create**.

The profile appears in the table. The directory name is sanitized (spaces become
underscores, invalid characters are removed) and made unique if it collides with
an existing profile.

### Duplicate a profile

Hover over a profile row and click the duplicate action button (**🞧**). This
opens the "Create New Profile" dialog pre-filled to copy the selected profile's
directory (including its saves and settings).

### Delete a profile

Hover over a profile row and click the delete action button (**🞮**), then confirm.
This removes the profile record **and** deletes its directory from disk.

### View profile information

Hover over a profile row and click the info action button (**👁**). The dialog
shows the profile name and directory id. Clicking the directory id opens the
profile's folder in the file explorer.

> The "Installed Mods" list is not implemented yet and shows placeholder data.

## Launching a profile

1. Select a profile by clicking its row.
2. Click **Launch Profile** in the footer.

FPM then:

1. Updates the profile's run stats.
2. Points Factorio's `write-data` directory at the selected profile.
3. Launches Factorio and closes FPM.

The profile's **Last Run** and **Total Runs** columns update accordingly.

## Search and sort

- **Search:** click the magnifying glass (**🔍**) in the "Profile Name" header to
  reveal the search box; type to filter profiles by name.
- **Sort:** click a column header (**Profile Name**, **Last Run**, **Total
  Runs**) to toggle ascending/descending order.

## Data and directories

FPM stores its data relative to its working directory:

- **Profile metadata** (names, ids, run stats) is kept in Neutralino storage.
- **Profile data directories** live under `profile/<directory-name>/`.
- **The Factorio installation** lives under `factorio/`.

If you uninstall, the uninstaller asks whether you also want to remove all
application data.
