import { unzip } from "./util/zip";
import { ensureDirectory } from "./util/util";
import type { Login } from "./types";

export default class Factorio {
    private _app: any;
    path: string | null = null;

    constructor(app: any) {
        this._app = app;
    }

    async install(): Promise<void> {
        this._app.ui.dialog(`
            <h2>Factorio is not installed!</h2>
            <p>Please download the Factorio ZIP from <a href="#" onclick="Neutralino.os.open('https://factorio.com/download')">here</a>
                and select it in the next step.</p>
            `,
            [{text: 'Install Factorio', primary: true, onClick: async () => {
                    try {
                        try { await Neutralino.filesystem.remove('factorio'); } catch (e) {}
                        let selectedFile = (await Neutralino.os.showOpenDialog("Open Factorio.zip", {
                            defaultPath: await Neutralino.os.getPath('downloads'),
                            filters: [{name: 'Factorio ZIP', extensions: ['zip']}]
                        }))[0];

                        if (!selectedFile) return this.install();

                        await unzip(selectedFile);

                        // Re-detect the freshly extracted executable so profiles can be
                        // launched immediately without restarting the app.
                        await this.detect();
                    } catch (e) {
                        console.error('Factorio installation failed:', e);
                        this._app.ui.dialog(`<p>Factorio installation failed:</p><pre>${e?.message || e}</pre>`, [{text: 'OK', primary: true}], true);
                    }
                }}]
        );
    }

    /**
     * Locate the Factorio executable and set `this.path`. Has no side effects
     * other than setting `this.path`.
     * @returns true when factorio.exe was found.
     */
    async detect(): Promise<boolean> {
        try {
            // The bulk of the game lives in factorio/data/. Requiring it ensures
            // a partial extraction (e.g. an interrupted install) is not treated
            // as a valid Factorio installation.
            const dataStats = await Neutralino.filesystem.getStats(await Neutralino.filesystem.getJoinedPath('factorio', 'data'));
            if (!dataStats.isDirectory) return false;

            let list = await Neutralino.filesystem.readDirectory(await Neutralino.filesystem.getJoinedPath('factorio', 'bin'));

            if (list.length === 0) return false;

            let path = await Neutralino.filesystem.getJoinedPath('factorio', 'bin', list[0].entry, 'factorio.exe');
            const exeStats = await Neutralino.filesystem.getStats(path);
            if (exeStats.size < 5_000_000) return false; // factorio.exe is tens of MB; reject truncated files

            this.path = path;

            return true;
        } catch (e) {
            return false;
        }
    }

    async checkInstalled(): Promise<void> {
        if (!(await this.detect())) {
            await this.install();
        }
    }

    /**
     * @param profile profile to launch
     * @param login optional Factorio.com credentials
     */
    async launch(profile: string, login: Login | null = null): Promise<void> {
        // Factorio might not have been detected yet (e.g. right after a fresh
        // install in the same session). Try once more before launching.
        if (!this.path) {
            await this.checkInstalled();
        }
        if (!this.path) {
            this._app.ui.dialog('<p>Factorio is not installed. Please install it before launching a profile.</p>', [{text: 'OK', primary: true}], true);
            return;
        }

        if (login) {
            // Factorio reads player-data.json from its write-data directory,
            // which this app redirects to the per-profile directory. The game
            // persists service-username/service-token there, so write them there.
            const playerDataPath = `profile/${profile}/player-data.json`;
            await ensureDirectory(`profile/${profile}`);

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
            config = await Neutralino.filesystem.readFile('factorio/config/config.ini');
        } catch (e) {
            // Factorio has not been set up yet
            await ensureDirectory('factorio/config');
            config = await Neutralino.resources.readFile('/resources/factorioDefault.ini');
        }

        config = config.replace(/^(write-data=)(.+)$/gm, 'write-data=__PATH__executable__\\..\\..\\..\\profile\\' + profile);
        await Neutralino.filesystem.writeFile('factorio/config/config.ini', config);

        await Neutralino.os.execCommand(
            // `cmd /c start` is needed to make the window stay open after the process exits
            `cmd /c start "" "\"${this.path}\""`,
            {background: true}
        );

        await this._app.exit();
    }
}
