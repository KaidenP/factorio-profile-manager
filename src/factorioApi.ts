/**
 * Client for Factorio's HTTP APIs.
 *
 * API calls (login, token verification, release listing) use Neutralino's
 * built-in `net` namespace, which runs in the native backend and is not
 * subject to browser CORS.
 *
 * The only exception is downloading the multi-GB Windows ZIP: the `net` API
 * returns text-only bodies, so the binary download shells out to the bundled
 * Windows `curl.exe` via `os.execCommand`.
 */

const AUTH_URL = 'https://auth.factorio.com/api-login';
const MATCHMAKING_URL = 'https://multiplayer.factorio.com/get-games';
const RELEASES_URL = 'https://factorio.com/api/latest-releases';
const DOWNLOAD_URL = 'https://www.factorio.com/get-download';

export interface LoginResult {
    username: string;
    token: string;
}

export interface VerifyResult {
    valid: boolean;
    reason?: string;
}

export interface AvailableReleases {
    stable: Record<string, string>;
    experimental: Record<string, string>;
}

/** Generate a service token from a Factorio.com username + password. */
export async function generateToken(username: string, password: string): Promise<LoginResult> {
    const body = [
        'username=' + encodeURIComponent(username),
        'password=' + encodeURIComponent(password),
        'api_version=6',
        'require_game_ownership=true'
    ].join('&');

    let res: any;
    try {
        res = await Neutralino.net.request(AUTH_URL, 'POST', {
            body,
            contentType: 'application/x-www-form-urlencoded',
        });
    } catch (e) {
        throw new Error(e?.message || String(e));
    }

    let data: any;
    try {
        data = JSON.parse(res.body);
    } catch (e) {
        throw new Error(`Unexpected response from Factorio: ${res.body}`);
    }

    if (data.error) {
        throw new Error(data.message || data.error);
    }
    if (!data.token) {
        throw new Error('Factorio did not return a token.');
    }

    return { username: data.username || username, token: data.token };
}

/** Verify that a username + token pair is accepted by the matchmaking API. */
export async function verifyToken(username: string, token: string): Promise<VerifyResult> {
    if (/["\r\n]/.test(username) || /["\r\n]/.test(token)) {
        return { valid: false, reason: 'Username/token contains unsupported characters.' };
    }

    const url = `${MATCHMAKING_URL}?username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`;
    let res: any;
    try {
        res = await Neutralino.net.get(url);
    } catch (e) {
        return { valid: false, reason: e?.message || String(e) };
    }

    try {
        const data = JSON.parse(res.body);
        if (Array.isArray(data)) return { valid: true };
        return { valid: false, reason: data.message || 'Token rejected by Factorio' };
    } catch (e) {
        return { valid: false, reason: res.body || 'Invalid response from Factorio' };
    }
}

/** Fetch the latest stable/experimental versions from Factorio. */
export async function listAvailableVersions(): Promise<AvailableReleases> {
    let res: any;
    try {
        res = await Neutralino.net.get(RELEASES_URL);
    } catch (e) {
        throw new Error(e?.message || String(e));
    }

    try {
        const data = JSON.parse(res.body);
        return { stable: data.stable || {}, experimental: data.experimental || {} };
    } catch (e) {
        throw new Error('Failed to parse the Factorio release list.');
    }
}

/** Download a Factorio ZIP to a local file (binary, so curl is used). */
export async function downloadVersion(
    version: string,
    build: string,
    distro: string,
    username: string,
    token: string,
    destFile: string
): Promise<void> {
    const url = `${DOWNLOAD_URL}/${version}/${build}/${distro}?username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`;
    const res = await Neutralino.os.execCommand(`curl -sS -L -o "${destFile}" "${url}"`, { background: false });

    if (res.exitCode !== 0) {
        throw new Error(res.stdErr || `Download failed (exit code ${res.exitCode})`);
    }
}
