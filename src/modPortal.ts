/**
 * Factorio mod portal client (https://mods.factorio.com).
 *
 * Browsing/search and downloading mods. The portal is a Factorio *internal*
 * API: search requires the same service username/token used everywhere else,
 * and download URLs are `?username=...&token=...` query params.
 *
 * The binary mod ZIP download shells out to `curl.exe` (the internal `net`
 * API is text-only); JSON calls use `Neutralino.net`.
 */

import { ensureDirectory } from "./util/util";
import { modsDir, addModToList } from "./mods";

const MODS_API = 'https://mods.factorio.com';

export interface ModRelease {
    /** Relative path, e.g. /download/foo/abc123. */
    download_url: string;
    file_name: string;
    version: string;
    sha1?: string;
    info_json?: { factorio_version?: string; dependencies?: string[] };
}

export interface ModSearchResult {
    name: string;
    title?: string;
    summary?: string;
    owner?: string;
    downloads_count?: number;
    deprecated?: boolean;
    /** Release id. The /api/search endpoint returns a bare id, unlike /api/mods. */
    latest_release?: string | null;
    latest_release_version?: string | null;
}

/** Build a downloadable release object from a /api/search result. */
export function releaseFromSearch(r: ModSearchResult): ModRelease | null {
    if (!r.latest_release || !r.latest_release_version) return null;
    return {
        download_url: `/download/${r.name}/${r.latest_release}`,
        file_name: `${r.name}_${r.latest_release_version}.zip`,
        version: r.latest_release_version,
    };
}

/** Free-text search via the authenticated mod portal search endpoint. */
export async function searchMods(
    query: string,
    version: string,
    username: string,
    token: string
): Promise<ModSearchResult[]> {
    const body = JSON.stringify({
        version,
        username,
        token,
        query,
        page_size: 25,
        sort_attribute: 'relevancy',
    });

    let res: any;
    try {
        res = await Neutralino.net.request(`${MODS_API}/api/search`, 'POST', {
            body,
            contentType: 'application/json',
        });
    } catch (e) {
        throw new Error(e?.message || String(e));
    }

    let data: any;
    try {
        data = JSON.parse(res.body);
    } catch (e) {
        throw new Error(`Unexpected response from the mod portal: ${res.body}`);
    }

    if (data.message) throw new Error(data.message);
    return Array.isArray(data.results) ? data.results : [];
}

/** Fetch full details (including dependencies) for a single mod. */
export async function getModDetails(name: string): Promise<any> {
    let res: any;
    try {
        res = await Neutralino.net.get(`${MODS_API}/api/mods/${encodeURIComponent(name)}/full`);
    } catch (e) {
        throw new Error(e?.message || String(e));
    }
    try {
        return JSON.parse(res.body);
    } catch (e) {
        throw new Error(`Unexpected response from the mod portal: ${res.body}`);
    }
}

/**
 * Download a mod release into the profile's mods directory and enable it.
 * Replaces any previously-installed version of the same mod.
 */
export async function installMod(
    profileId: string,
    name: string,
    release: ModRelease,
    username: string,
    token: string
): Promise<void> {
    await ensureDirectory(modsDir(profileId));

    // Remove any previously-installed version of this mod.
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

    const url = `${MODS_API}${release.download_url}?username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`;
    try { await Neutralino.filesystem.remove('mod_download.zip'); } catch (e) {}

    const res = await Neutralino.os.execCommand(`curl -sS -L -o "mod_download.zip" "${url}"`, { background: false });
    if (res.exitCode !== 0) {
        throw new Error(res.stdErr || `Mod download failed (exit code ${res.exitCode})`);
    }

    const dest = `${modsDir(profileId)}/${release.file_name}`;
    try { await Neutralino.filesystem.remove(dest); } catch (e) {}
    await Neutralino.filesystem.move('mod_download.zip', dest);

    await addModToList(profileId, name);
}
