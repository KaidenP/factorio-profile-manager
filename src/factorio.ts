import { unzip } from "./util/zip";
import { ensureDirectory } from "./util/util";
import type { Login, Profile } from "./types";

const VERSIONS_DIR = 'versions';

export default class Factorio {
    private _app: any;
    path: string | null = null;

    constructor(app: any) {
        this._app = app;
    }

    getVersionPath(version: string): string {
        return `${VERSIONS_DIR}/${version}`;
    }

    /** Parse a Factorio version (e.g. "2.1.24") out of a download file name. */
    parseVersionFromZip(filePath: string): string {
        const match = filePath.match(/(\d+\.\d+\.\d+)/);
        if (!match) {
            throw new Error('Could not determine the Factorio version from the file name. Use a standard Factorio ZIP (e.g. factorio_..._2.1.24.zip).');
        }
        return match[1];
    }

    /** List installed versions by scanning the versions/ directory. */
    async getInstalledVersions(): Promise<string[]> {
        try {
            const list = await Neutralino.filesystem.readDirectory(VERSIONS_DIR);
            return list.filter((e: any) => e.type === 'DIRECTORY').map((e: any) => e.entry);
        } catch (e) {
            return [];
        }
    }

    /** Return the factorio.exe path for a version, or null when not installed. */
    async detectVersion(version: string): Promise<string | null> {
        const base = this.getVersionPath(version);
        try {
            const dataStats = await Neutralino.filesystem.getStats(await Neutralino.filesystem.getJoinedPath(base, 'data'));
            if (!dataStats.isDirectory) return null;

            const list = await Neutralino.filesystem.readDirectory(await Neutralino.filesystem.getJoinedPath(base, 'bin'));
            if (list.length === 0) return null;

            const path = await Neutralino.filesystem.getJoinedPath(base, 'bin', list[0].entry, 'factorio.exe');
            const exeStats = await Neutralino.filesystem.getStats(path);
            if (exeStats.size < 5_000_000) return null; // factorio.exe is tens of MB; reject truncated files

            return path;
        } catch (e) {
            return null;
        }
    }

    /** Detect any installed version and set `this.path`. */
    async detect(): Promise<boolean> {
        const versions = await this.getInstalledVersions();
        for (const v of versions) {
            const p = await this.detectVersion(v);
            if (p) {
                this.path = p;
                return true;
            }
        }
        this.path = null;
        return false;
    }

    async checkInstalled(version?: string): Promise<void> {
        if (version) {
            const p = await this.detectVersion(version);
            if (p) {
                this.path = p;
                return;
            }
        } else if (await this.detect()) {
            return;
        }
        await this.install();
    }

    async install(): Promise<void> {
        this._app.ui.dialog(`
            <h2>Install a Factorio version</h2>
            <p>Download the Factorio ZIP for the version you want from <a href="#" onclick="Neutralino.os.open('https://factorio.com/download')">factorio.com/download</a>
                and select it in the next step. Each version is installed once and shared by all profiles that use it.</p>
            `,
            [{text: 'Select Factorio ZIP', primary: true, onClick: async () => {
                    try {
                        let selectedFile = (await Neutralino.os.showOpenDialog("Open Factorio.zip", {
                            defaultPath: await Neutralino.os.getPath('downloads'),
                            filters: [{name: 'Factorio ZIP', extensions: ['zip']}]
                        }))[0];

                        if (!selectedFile) return this.install();

                        const version = this.parseVersionFromZip(selectedFile);
                        const destination = this.getVersionPath(version);

                        // Dedup: reuse an existing install of the same version.
                        const existing = await this.detectVersion(version);
                        if (existing) {
                            this.path = existing;
                            this._app.ui.dialog(`Factorio ${version} is already installed.`, [{text: 'OK', primary: true}], true);
                            return;
                        }

                        await unzip(selectedFile, destination);

                        // Re-detect so profiles can launch immediately.
                        await this.detect();
                    } catch (e) {
                        console.error('Factorio installation failed:', e);
                        this._app.ui.dialog(`<p>Factorio installation failed:</p><pre>${e?.message || e}</pre>`, [{text: 'OK', primary: true}], true);
                    }
                }}]
        );
    }

    async launch(profile: Profile, login: Login | null = null): Promise<void> {
        const version = profile.version;
        if (!version) {
            this._app.ui.dialog('<p>This profile has no Factorio version assigned. Please install a version and re-create the profile.</p>', [{text: 'OK', primary: true}], true);
            return;
        }

        const exePath = await this.detectVersion(version);
        if (!exePath) {
            this._app.ui.dialog(`<p>Factorio ${version} is not installed. Install it before launching this profile.</p>`,
                [{text: 'Install', primary: true, onClick: () => this.install()}, {text: 'Cancel'}], true);
            return;
        }
        this.path = exePath;

        const versionDir = this.getVersionPath(version);

        if (login) {
            // Factorio reads player-data.json from its write-data directory,
            // which this app redirects to the per-profile directory.
            const playerDataPath = `profile/${profile.id}/player-data.json`;
            await ensureDirectory(`profile/${profile.id}`);

            let playerData: any;
            try {
                playerData = JSON.parse(await Neutralino.filesystem.readFile(playerDataPath));
            } catch (e) {playerData = {}}

            playerData["service-username"] = login.username;
            playerData["service-token"] = login.token;

            await Neutralino.filesystem.writeFile(playerDataPath, JSON.stringify(playerData, null, 4));
        }

        let config: string;
        try {
            config = await Neutralino.filesystem.readFile(`${versionDir}/config/config.ini`);
        } catch (e) {
            await ensureDirectory(`${versionDir}/config`);
            config = await Neutralino.resources.readFile('/resources/factorioDefault.ini');
        }

        // write-data points at the per-profile directory. The executable lives
        // at versions/<version>/bin/<platform>/factorio.exe, so four levels up
        // from __PATH__executable__ is the app root (NL_CWD) holding profile/.
        config = config.replace(/^(write-data=)(.+)$/gm, 'write-data=__PATH__executable__\\..\\..\\..\\..\\profile\\' + profile.id);
        await Neutralino.filesystem.writeFile(`${versionDir}/config/config.ini`, config);

        await Neutralino.os.execCommand(
            // `cmd /c start` is needed to make the window stay open after the process exits
            `cmd /c start "" "\"${this.path}\""`,
            {background: true}
        );

        await this._app.exit();
    }
}
