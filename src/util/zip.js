import { unzipRaw as unzipit} from 'unzipit';
import {dialog} from "../ui/dialog";
import loadingUI from "../ui/loading";
import queueWorker from "../queueWorker";
import {ensureDirectory} from "./util";

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

    loadingUI.show("Unzipping (this will take a while)...")
    let zipped = (await unzipit(new NeutralinoReader(filePath))).entries;

    let qw = new queueWorker({concurrencyLimit: 25})

    const totalSizeMB = zipped.reduce((acc, file) => acc + file.size, 0)/1024/1024;
    let completedSize = 0;

    let startTime = (new Date()).getTime();
    let lastFile = 'Waiting for first file to be extracted...';
    function updateProgress(bytes, lf = lastFile) {
        completedSize+=bytes;
        lastFile = lf;
        let completedSizeMB = completedSize/1024/1024;
        let percent = completedSizeMB*100 / totalSizeMB;
        let timeTaken = (new Date()).getTime() - startTime;

        let timeRemainingMs = (timeTaken / percent * (100 - percent));
        let date = new Date(0);
        date.setMilliseconds(timeRemainingMs); // specify value for SECONDS here
        let timeString = date.toISOString().substring(11, 19)

        loadingUI.setProgress(percent, `
            Extracted file ${completedSizeMB.toFixed(2)}MB of ${totalSizeMB.toFixed(2)}MB...
            ${(completedSize*1000/timeTaken/1024/1024).toFixed(2)}MB/s [${timeString}]
            (${percent.toFixed(2)}%)<pre>${lastFile}</pre>`)
    }

    let paths = [];

    for (let i= 0; i < zipped.length; i++) {
        let file = zipped[i];
        let outPath = file.name.replace(/^\S+?\//, 'factorio/')

        paths.push((await Neutralino.filesystem.getPathParts(outPath)).parentPath)

        qw.addTask(async () => {
            try {
                // // Dummy Loader to test ui
                // await (new Promise((resolve) => {setTimeout(resolve,25)}))

                let data = await file.arrayBuffer()
                const totalBytes = data.byteLength;

                if (totalBytes <= 1024 * 1024 * 24) {
                    // If the file is small enough, write it directly to the file instead of using appendBinaryFile

                    await Neutralino.filesystem.writeBinaryFile(outPath, data)
                    updateProgress(file.size, outPath)
                    return;
                }

                const CHUNK_SIZE = 1024 * 1024 * 8;

                // clear the file if it exists
                // await Neutralino.filesystem.writeBinaryFile(outPath, new ArrayBuffer(0))

                for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
                    const end = Math.min(offset + CHUNK_SIZE, totalBytes);
                    const chunk = data.slice(offset, end);
                    await Neutralino.filesystem.appendBinaryFile(outPath, chunk);
                    updateProgress((offset + CHUNK_SIZE) > totalBytes ? totalBytes - offset : CHUNK_SIZE)
                }

                updateProgress(0, outPath)
            } catch (e) {
                loadingUI.hide()
                console.error('Error while unzipping:', e)
                dialog(`Fatal Error While Unzipping file "${outPath}": ${e.message}`, [])
                qw.stop()?.then(()=>Neutralino.filesystem.remove('factorio'))
            }
        })
    }

    paths = paths.slice().sort().filter((path, i) => {
        // Check if the next item starts with "path/"
        return !(paths[i + 1] && paths[i + 1].startsWith(path + '/'));
    })

    loadingUI.setProgress(0, 'Preparing directories...')
    try {
        await Neutralino.filesystem.remove('factorio');
    } catch (e) {}


    for (let path of paths) {
        // Create the directory if needed
        await ensureDirectory(path);
    }

    // qw.shuffle();
    startTime = (new Date()).getTime();
    loadingUI.setProgress(0, 'Extracting...')
    await qw.run();
    loadingUI.hide();
    dialog('All files have been extracted successfully!', [{text: 'Okay', primary:true}], true);
}