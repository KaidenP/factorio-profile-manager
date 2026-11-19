import { unzipRaw as unzipit} from 'unzipit';
import {dialog} from "../ui/dialog";
import loadingUI from "../ui/loading";
import queueWorker from "../queueWorker";
import {ensureDirectory} from "./util";

/**
 * Unzips a file using Neutralino's filesystem API and unzipit.
 *
 * @param {string} filePath - The absolute or relative path to the zip file.
 * @returns {Promise<void>}
 */
export async function unzip(filePath) {
    try {
        loadingUI.show("Extracting Factorio...", "indeterminate");

        try {
            await extractWithTar(filePath);
        } catch (e) {
            console.warn('Native tar extraction failed; falling back to JavaScript extraction:', e);
            await extractWithJS(filePath);
        }

        loadingUI.hide();
        dialog('All files have been extracted successfully!', [{text: 'Okay', primary:true}], true);
    } catch (e) {
        console.error('Error while unzipping:', e)
        loadingUI.hide()
        try {
            await Neutralino.filesystem.remove('factorio');
        } catch (e2) {}
        dialog(`Fatal Error While Unzipping: ${e?.message || e}`, [{text: 'Okay', primary: true}])
    }
}

/**
 * Extracts using the `tar` (bsdtar/libarchive) binary bundled with Windows,
 * which reads ZIP natively and avoids Neutralino's slow base64/WebSocket binary
 * bridge. Falls back to `extractWithJS` when tar is unavailable or fails.
 */
async function extractWithTar(filePath) {
    const isShellSafe = (p) => /^[A-Za-z0-9_.\/\\:-]+$/.test(p);

    let target = filePath;
    let cleanupTarget = false;

    if (!isShellSafe(filePath)) {
        // cmd.exe quoting is fragile, so use a space/special-char-free path.
        target = 'factorio_download.zip';
        await Neutralino.filesystem.copy(filePath, target);
        cleanupTarget = true;
    }

    try {
        try { await Neutralino.filesystem.remove('factorio'); } catch (e) {}
        await Neutralino.filesystem.createDirectory('factorio');

        const result = await Neutralino.os.execCommand(
            `tar -xf ${target} --strip-components=1 -C factorio`,
            {background: false}
        );

        if (result.exitCode !== 0) {
            throw new Error(`tar exited with code ${result.exitCode}: ${result.stdErr || result.stdOut}`);
        }
    } finally {
        if (cleanupTarget) {
            try { await Neutralino.filesystem.remove(target); } catch (e) {}
        }
    }
}

/**
 * Slower fallback extractor using unzipit + Neutralino's filesystem API.
 */
async function extractWithJS(filePath) {
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
    let fatalError = null;

    for (let i= 0; i < zipped.length; i++) {
        let file = zipped[i];
        let outPath = file.name.replace(/^\S+?\//, 'factorio/')

        paths.push((await Neutralino.filesystem.getPathParts(outPath)).parentPath)

        qw.addTask(async () => {
            if (fatalError) return;

            try {
                let data = await file.arrayBuffer()
                const totalBytes = data.byteLength;

                if (totalBytes <= 1024 * 1024 * 24) {
                    // If the file is small enough, write it directly to the file instead of using appendBinaryFile
                    await Neutralino.filesystem.writeBinaryFile(outPath, data)
                    updateProgress(file.size, outPath)
                    return;
                }

                const CHUNK_SIZE = 1024 * 1024 * 8;

                for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
                    const end = Math.min(offset + CHUNK_SIZE, totalBytes);
                    const chunk = data.slice(offset, end);
                    await Neutralino.filesystem.appendBinaryFile(outPath, chunk);
                    updateProgress((offset + CHUNK_SIZE) > totalBytes ? totalBytes - offset : CHUNK_SIZE)
                }

                updateProgress(0, outPath)
            } catch (e) {
                console.error(`Error while unzipping "${outPath}":`, e)
                if (!fatalError) fatalError = e;
            }
        })
    }

    // Normalize separators, dedupe, then keep only the deepest directories
    // (create_directories creates missing parents recursively).
    paths = Array.from(new Set(paths.map(p => p.replace(/\\/g, '/'))))
        .sort()
        .filter((path, i, arr) => {
            // Drop a path when the next (sorted) entry is one of its children.
            return !(arr[i + 1] && arr[i + 1].startsWith(path + '/'));
        });

    loadingUI.setProgress(0, 'Preparing directories...')
    try {
        await Neutralino.filesystem.remove('factorio');
    } catch (e) {}

    for (let path of paths) {
        // Create the directory if needed
        await ensureDirectory(path);
    }

    startTime = (new Date()).getTime();
    loadingUI.setProgress(0, 'Extracting...')
    await qw.run();

    if (fatalError) throw fatalError;
}
