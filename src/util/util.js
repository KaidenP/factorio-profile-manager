export async function ensureDirectory(path) {
    try {
        await Neutralino.filesystem.createDirectory(path);
    } catch (e) {
        let pathStats = await Neutralino.filesystem.getStats(path);
        if (!pathStats.isDirectory) {
            await Neutralino.filesystem.remove(path);
            await Neutralino.filesystem.createDirectory(path);
        }
    }
}