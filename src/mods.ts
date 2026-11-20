/**
 * Local mod management for a profile's Factorio write-data directory.
 *
 * Factorio keeps each profile's mods in `profile/<id>/mods/`:
 *   - `mod-list.json` maps mod names to an enabled flag.
 *   - each enabled mod's files are `<name>_<version>.zip`.
 * The built-in `base` mod is always present and always enabled.
 */

import { ensureDirectory } from "./util/util";

export interface ModEntry {
    name: string;
    enabled: boolean;
}

export const BASE_MOD = 'base';

export function modsDir(profileId: string): string {
    return `profile/${profileId}/mods`;
}

export function modListPath(profileId: string): string {
    return `${modsDir(profileId)}/mod-list.json`;
}

/** Read the profile's mod list. Returns [] when the list doesn't exist yet. */
export async function readModList(profileId: string): Promise<ModEntry[]> {
    try {
        const data = JSON.parse(await Neutralino.filesystem.readFile(modListPath(profileId)));
        if (!Array.isArray(data.mods)) return [];
        return data.mods.map((m: any) => ({ name: String(m.name), enabled: !!m.enabled }));
    } catch (e) {
        return [];
    }
}

/** Write the full mod list, creating the mods directory if needed. */
export async function writeModList(profileId: string, mods: ModEntry[]): Promise<void> {
    await ensureDirectory(modsDir(profileId));
    await Neutralino.filesystem.writeFile(modListPath(profileId), JSON.stringify({ mods }, null, 4));
}

/** Enable or disable a mod in the profile's mod list. */
export async function setModEnabled(profileId: string, name: string, enabled: boolean): Promise<void> {
    const mods = await readModList(profileId);
    const existing = mods.find(m => m.name === name);
    if (existing) {
        existing.enabled = enabled;
    } else {
        mods.push({ name, enabled });
    }
    await writeModList(profileId, mods);
}

/** Delete a mod's files and remove it from the mod list. */
export async function removeMod(profileId: string, name: string): Promise<void> {
    if (name === BASE_MOD) throw new Error('The base mod cannot be removed.');

    // Remove any `<name>_<version>.zip` file in the mods directory.
    try {
        const list = await Neutralino.filesystem.readDirectory(modsDir(profileId));
        for (const entry of list) {
            if (entry.type !== 'FILE') continue;
            const lower = entry.entry.toLowerCase();
            if (lower.startsWith(name.toLowerCase() + '_') && lower.endsWith('.zip')) {
                await Neutralino.filesystem.remove(await Neutralino.filesystem.getJoinedPath(modsDir(profileId), entry.entry));
            }
        }
    } catch (e) {}

    const mods = (await readModList(profileId)).filter(m => m.name !== name);
    await writeModList(profileId, mods);
}

/** Register an installed mod zip in the profile's mod list (enabled). */
export async function addModToList(profileId: string, name: string): Promise<void> {
    await setModEnabled(profileId, name, true);
}
