export async function ensureDirectory(path) {
    try {
        await Neutralino.filesystem.createDirectory(path);
    } catch (e) {
        let pathStats;
        try {
            pathStats = await Neutralino.filesystem.getStats(path);
        } catch (e2) {
            // The path doesn't exist and we couldn't create it.
            throw new Error(`Failed to create directory "${path}": ${e2?.message || e2}`);
        }
        if (!pathStats.isDirectory) {
            await Neutralino.filesystem.remove(path);
            await Neutralino.filesystem.createDirectory(path);
        }
    }
}
