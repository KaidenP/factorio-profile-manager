import {unzip} from "./util/zip";


export default class Factorio {
    constructor(app) {
        this._app = app;
    }

    path = null;
    version = null;

    async checkInstalled() {
        try {
            let list = await Neutralino.filesystem.readDirectory(await Neutralino.filesystem.getJoinedPath('factorio', 'bin'));

            console.log(list.filter(f => f.type === 'DIRECTORY').map(f => f.entry));
        } catch (e) {
            if (e?.code !== "NE_FS_NOPATHE") throw e;

            this._app.ui.dialog(`
            <h2>Factorio is not installed!</h2>
            <p>Please download the Factorio ZIP from <a href="#" onclick="Neutralino.os.open('https://factorio.com/download')">here</a>
                and select it in the next step.</p>
            `,
                [{text: 'Install Factorio', primary: true, onClick: async () => {
                    let selectedFile = (await Neutralino.os.showOpenDialog("Open Factorio.zip", {
                        defaultPath: await Neutralino.os.getPath('downloads'),
                        filters: [{name: 'Factorio ZIP', extensions: ['zip']}]
                    }))[0];

                    if (!selectedFile) return this.checkInstalled();

                    let files = await unzip(selectedFile);
                }}]
            )
        }
    }
}