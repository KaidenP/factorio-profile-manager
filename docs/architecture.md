# Architecture

## Project layout

```
├── .github/
│   ├── workflows/          # CI/CD (push.yaml, release.yaml)
│   └── screenshots/        # README screenshots
├── resources/              # Neutralino document root (served to the webview)
│   ├── css/                # Split stylesheets imported by styles.css
│   ├── icons/              # App icons (PNG + ICO)
│   ├── js/build/           # webpack output (app.bundle.js)
│   ├── index.html          # Main UI markup and modal templates
│   ├── styles.css          # Entry stylesheet (@imports css/*.css)
│   └── factorioDefault.ini # Default Factorio config used on first launch
├── src/
│   ├── app.js              # Application class (entry point)
│   ├── factorio.js         # Factorio install/detect/launch logic
│   ├── queueWorker.js      # Generic concurrency-limited task queue
│   ├── ui/
│   │   ├── index.js        # UI bootstrap (wires modules together)
│   │   ├── table.js        # Profile table render / search / sort
│   │   ├── dialog.js       # Modal dialog helper
│   │   ├── loading.js      # Progress/loading modal singleton
│   │   ├── modals.js       # Add-profile and info modals
│   │   └── window.js       # Draggable region + close button
│   └── util/
│       ├── util.js         # ensureDirectory helper
│       └── zip.js          # Factorio ZIP extraction
├── neutralino.config.json  # Neutralino app configuration
├── package.json            # Dependencies and npm scripts
├── setup.iss               # Inno Setup installer script
├── webpack.config.js       # webpack bundling config
└── yarn.lock
```

## Entry point and bootstrapping

`src/app.js` is the webpack entry. It:

1. Imports `@neutralinojs/lib`, the `Factorio` class, and the `UI` module.
2. Defines a single `Application` class and instantiates it immediately.
3. Exposes helpers on `window` (`window.App`, `window.Neutralino`).
4. Calls `Neutralino.init()`, then `UI(this)` to set up the UI.
5. Asynchronously calls `this.load()` (profile data) and
   `this.factorio.checkInstalled()` (Factorio detection).

The bundled output is written to `resources/js/build/app.bundle.js` and loaded by
`resources/index.html` after Neutralino's `__neutralino_globals.js`.

## The `Application` class (`src/app.js`)

`Application` owns the application state and is the coordinating object that the
UI modules and the `Factorio` class receive and call back into.

Key members:

| Member | Purpose |
| --- | --- |
| `_profile_data` | Array of profile objects, loaded from storage. |
| `_selected_profile` | The id of the currently selected profile. |
| `_dirty` | Flag/setter that triggers a save when state changes. |
| `factorio` | A `Factorio` instance. |
| `ui` | The UI module namespace. |

Key methods:

| Method | Purpose |
| --- | --- |
| `load(forceReload)` | Loads profile data from Neutralino storage; falls back to `[]`; selects the marked/default profile; re-renders. |
| `save()` | Writes `_profile_data` to Neutralino storage as JSON. |
| `sort(field, order)` | Sorts profiles in place by `name`, `lastRun`, or `totalRuns`. |
| `addProfile(name, id, from)` | Creates a new profile directory (or copies an existing one), adds the record, re-renders. |
| `deleteProfile(id)` | Confirms, removes the record and the profile directory. |
| `launch(username)` | Updates stats, saves, and delegates to `factorio.launch`. |
| `exit()` | Saves if dirty, then exits the app. |
| `render()` | Delegates to `UI.table.renderTable`. |

### Profile data model

Each profile is a plain object persisted in a JSON array:

```json
{
  "id": "my-profile",
  "name": "My Profile",
  "lastRun": 1710000000000,
  "totalRuns": 7,
  "selected": true
}
```

- `id` is the profile directory name (and the primary key).
- `name` is the display name shown in the table.
- `lastRun` is an epoch-milliseconds timestamp (`0` means never run).
- `totalRuns` is an integer counter.
- `selected` is a transient marker (`true` on at most one profile).

The array is stored under the Neutralino storage key `profile_data`.

## Filesystem layout

Neutralino's `dataLocation` is `./`, so the relative filesystem paths below are
resolved against the app's working directory:

```
├── profile/
│   └── <profile-id>/      # One directory per profile (Factorio write-data)
│       └── player-data.json   # Optional, written when login info is supplied
├── factorio/
│   ├── bin/<platform>/factorio.exe
│   └── config/config.ini  # Rewritten on each launch to point at a profile
```

- `profile/<id>` is the Factorio `write-data` directory for that profile.
- `factorio/` holds the extracted Factorio installation.

## The `Factorio` class (`src/factorio.js`)

`Factorio` handles everything related to the Factorio installation.

### `checkInstalled()`

Reads `factorio/bin`, expects a platform subdirectory containing `factorio.exe`,
and stores the resolved path. If the directory is missing or empty, it calls
`install()`.

### `install()`

Shows a dialog explaining that Factorio is not installed, offers a link to
`https://factorio.com/download`, then opens a file picker filtered to `.zip`.
The selected ZIP is passed to `unzip()` (see below).

### `launch(profile, login)`

1. If `login` is provided, reads (or creates) `profile/<id>/player-data.json`
   and writes `service-username` / `service-token` into it.
2. Reads `factorio/config/config.ini`; if it does not exist, falls back to the
   bundled `resources/factorioDefault.ini` (after ensuring `factorio/config/`
   exists).
3. Rewrites the `write-data=` line to point at
   `__PATH__executable__\..\..\..\profile\<profile>`.
4. Writes the modified config back to `factorio/config/config.ini`.
5. Launches the game with
   `cmd /c start "" "<path to factorio.exe>"` in the background.
6. Calls `app.exit()` — FPM exits once the game has been handed off.

## ZIP extraction (`src/util/zip.js`)

The `unzip(filePath)` function extracts the Factorio ZIP:

- Uses `unzipit` with a custom `NeutralinoReader` adapter so entries can be read
  through `Neutralino.filesystem.readBinaryFile` (offset/size reads).
- Strips the first path segment from each entry (`file.name.replace(/^\S+?\//, 'factorio/')`)
  so the archive's top-level folder becomes `factorio/`.
- Queues each file on a `QueueWorker` with `concurrencyLimit: 25`.
- Files ≤ 24 MB are written in one `writeBinaryFile` call; larger files are
  written in 8 MB chunks via `appendBinaryFile`.
- A loading modal reports overall progress (extracted size, rate, ETA, and
  current file).

## The `QueueWorker` (`src/queueWorker.js`)

A small generic task queue:

- `addTask(task)` — enqueues a `() => Promise` function.
- `run()` — starts up to `concurrencyLimit` tasks and resolves when the queue
  drains.
- `shuffle()` — randomizes pending tasks.
- `stop()` — rejects/resolves the run promise and stops accepting work.

`unzip()` is the main consumer.

## UI modules (`src/ui/`)

| Module | Responsibility |
| --- | --- |
| `index.js` | Entry: sets `UI.app`, calls `windowSetup`, `modals.init`, `table.setup`. |
| `window.js` | Makes the title-bar grip a Neutralino draggable region and wires the close button to `app.exit()`. |
| `table.js` | Renders the profile table, handles row selection, search (`reevaluateSearch`), and column sorting (`sortProfiles`). |
| `dialog.js` | Builds and displays modal dialogs from an HTML string or element plus a button list. |
| `loading.js` | Singleton controlling the progress/loading modal (indeterminate or determinate with progress text). |
| `modals.js` | Add-profile and profile-info modals, plus the "Launch Profile" button and "open profile folder" action. |

### UI event flow

- Selecting a row sets `app.selectedProfile` (which updates the `selected` marker
  and triggers a save via the `_dirty` setter).
- Row action buttons: info (show info modal), duplicate (opens add-profile modal
  pre-filled to copy), delete (confirm then delete).
- Sorting/search re-render the table via `app.profileData`.

## Styling

`resources/styles.css` imports five split stylesheets under `resources/css/`:

- `variables.css` — CSS custom properties (colors, accents).
- `base.css` — body base, scrollbar styling.
- `layout.css` — title bar, main area, table container, footer.
- `components.css` — table, buttons, inputs, form groups.
- `modals.css` — modal overlay, info modal, progress bar.

The app uses a dark theme with an orange accent (`#ff9f1c`).

## Neutralino configuration highlights

`neutralino.config.json` configures the app shell:

- `applicationId`: `github.KaidenP.FPM`
- `defaultMode`: `window`, fixed at **960×540**, non-resizable, borderless,
  `exitProcessOnClose: true`.
- `documentRoot`: `/resources/`, `url`: `/`.
- `tokenSecurity`: `one-time`, `enableNativeAPI: true`.
- `nativeAllowList` enables `app.*`, `os.*`, `debug.*`, `window.*`, `computer.*`,
  `filesystem.*`, `storage.*`, and `resources.*`.
- `dataLocation`: `./`.
- `cli` pins `binaryVersion` and `clientVersion` to `6.4.0`.

## Known limitations / unimplemented areas

- **Mod list:** the info modal renders a hard-coded mock list and is marked
  *"Not Implemented"*.
- **Automatic Factorio downloads** and **one shared game copy** are listed as
  planned features in the README but are not implemented.
- The app currently exits after launching Factorio (it does not stay resident to
  watch the game process).
