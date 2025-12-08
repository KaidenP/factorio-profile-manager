import {unzip} from "./util/zip";
import {ensureDirectory} from "./util/util";
import {dialog} from "./ui/dialog";


export default class Factorio {
    constructor(app) {
        this._app = app;
    }

    path = null;

    async install() {
        this._app.ui.dialog(`
            <h2>Factorio is not installed!</h2>
            <p>Please download the Factorio ZIP from <a href="#" onclick="Neutralino.os.open('https://factorio.com/download')">here</a>
                and select it in the next step.</p>
            `,
            [{text: 'Install Factorio', primary: true, onClick: async () => {
                    await Neutralino.filesystem.remove('factorio');
                    let selectedFile = (await Neutralino.os.showOpenDialog("Open Factorio.zip", {
                        defaultPath: await Neutralino.os.getPath('downloads'),
                        filters: [{name: 'Factorio ZIP', extensions: ['zip']}]
                    }))[0];

                    if (!selectedFile) return this.checkInstalled();

                    let files = await unzip(selectedFile);
                }}]
        )
    }

    async checkInstalled() {
        try {
            let list = await Neutralino.filesystem.readDirectory(await Neutralino.filesystem.getJoinedPath('factorio', 'bin'));

            if (list.length === 0) {
                await this.install();
                return;
            }

            let path = await Neutralino.filesystem.getJoinedPath('factorio', 'bin', list[0].entry, 'factorio.exe');
            let fileInfo = await Neutralino.filesystem.getStats(path);

            this.path = path;

            return true;
        } catch (e) {
            // if (e?.code !== "NE_FS_NOPATHE") throw e;
            await this.install();
        }
    }

    /**
     * @param {string} profile profile to launch
     * @param {Object?} login
     * @param {string} login.username
     * @param {string} login.token
     */
    async launch(profile, login) {
        if (login) {
            let playerData;
            try {
                playerData = JSON.parse(await Neutralino.filesystem.readFile('profile/' + profile + '/player-data.json'));
            } catch (e) {playerData = {}}

            playerData["service-username"] = login.username;
            playerData["service-token"] = login.username;

            await Neutralino.filesystem.writeFile('profile/' + profile + '/player-data.json', JSON.stringify(playerData, null, 4));
        }

        let config;
        try {
            config = await Neutralino.filesystem.readFile('factorio/config/config.ini');
        } catch (e) {
            // Factorio has not been set up yet
            await ensureDirectory('factorio/config');
            // await Neutralino.resources.extractFile('/resources/factorioDefault.ini', 'factorio/config/config.ini');
            config = await Neutralino.resources.readFile('/resources/factorioDefault.ini');
        }

        config = config.replace(/^(write-data=)(.+)$/gm, 'write-data=__PATH__executable__\\..\\..\\..\\profile\\' + profile);
        await Neutralino.filesystem.writeFile('factorio/config/config.ini', config);

        // await Neutralino.os.open(this.path);
        await Neutralino.os.execCommand(
            // this.path,
            // `cmd /c start` is needed to make the window stay open after the process exits
            `cmd /c start "" "\"${this.path}\""`,
            {background:true}
        );

        await this._app.exit();
    }
}