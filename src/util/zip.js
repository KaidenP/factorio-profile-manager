import { unzipRaw as unzipit} from 'unzipit';
import {dialog} from "../ui/dialog";
import loadingUI from "../ui/loading";
import queueWorker from "../queueWorker";

/**
 * Unzips a file using Neutralino's filesystem API and unzipit.
 *
 * @param {string} filePath - The absolute or relative path to the zip file.
 * @returns {Promise<import('unzipit').ZipInfo>} The unzipit ZipInfo object containing entries.
 */
export async function unzip(filePath) {
    class NeutralinoReader {
        filePath;
        constructor(filePath) {
            this.filePath = filePath;
        }

        stats = null;
        async getLength() {
            return this.stats?.size || (this.stats = await Neutralino.filesystem.getStats(filePath)).size;
        }

        async read(offset, length) {
            const data = await Neutralino.filesystem.readBinaryFile(filePath, {
                pos: offset,
                size: length
            });
            return new Uint8Array(data);
        }
    }

    loadingUI.show("Unzipping...")
    let zipped = (await unzipit(new NeutralinoReader(filePath))).entries;

    let qw = new queueWorker({concurrencyLimit: 100})

    let completed = 0;
    let total = zipped.length;

    function updateProgress(lastFile) {
        completed++;
        loadingUI.setProgress(completed / total * 100, `Extracted file ${completed} of ${total}...<pre>${lastFile}</pre>`)
    }

    for (let i= 0; i < total; i++) {
        let file = zipped[i];
        let outPath = file.name.replace(/^\S+?\//, 'factorio/')

        qw.addTask(async () => {
            try {
                // // Dummy Loader to test ui
                // await (new Promise((resolve) => {setTimeout(resolve,25)}))

                // Create the directory if needed
                let parentPath = (await Neutralino.filesystem.getPathParts(outPath)).parentPath;
                try {
                    let parentPathStats = await Neutralino.filesystem.getStats(parentPath);
                    if (!parentPathStats.isDirectory) {
                        await Neutralino.filesystem.remove(parentPath);
                        await Neutralino.filesystem.createDirectory(parentPath);
                    }
                } catch (e) { await Neutralino.filesystem.createDirectory(parentPath); }

                let data = await file.arrayBuffer()

                const CHUNK_SIZE = 1024 * 1024 * 16;
                const totalBytes = data.byteLength;

                // clear the file if it exists
                await Neutralino.filesystem.writeBinaryFile(outPath, new ArrayBuffer(0))

                for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
                    const end = Math.min(offset + CHUNK_SIZE, totalBytes);
                    const chunk = data.slice(offset, end);
                    await Neutralino.filesystem.appendBinaryFile(outPath, chunk);
                }

                updateProgress(outPath)
            } catch (e) {
                loadingUI.hide()
                console.error('Error while unzipping:', e)
                dialog(`Fatal Error While Unzipping file "${outPath}": ${e.message}`, [])
                qw.stop()?.then(()=>Neutralino.filesystem.remove('factorio'))
            }
        })

        await qw.run()
    }
}