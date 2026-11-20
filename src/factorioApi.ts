/**
 * Minimal client for Factorio's authentication and matchmaking HTTP APIs.
 *
 * Factorio's APIs do not send CORS headers, so these run through the bundled
 * Windows `curl.exe` via `Neutralino.os.execCommand` instead of `fetch`.
 *
 * Notes:
 * - `api-login` generates a service token from a username + password.
 * - `get-games` (matchmaking) is used to verify that a username + token pair
 *   is accepted, since there is no dedicated "verify token" endpoint.
 */

const AUTH_URL = 'https://auth.factorio.com/api-login';
const MATCHMAKING_URL = 'https://multiplayer.factorio.com/get-games';
const BODY_FILE = 'fpm_auth_body.txt';

export interface LoginResult {
    username: string;
    token: string;
}

export interface VerifyResult {
    valid: boolean;
    reason?: string;
}

interface ExecResult {
    exitCode: number;
    stdOut: string;
    stdErr: string;
}

function exec(command: string): Promise<ExecResult> {
    return Neutralino.os.execCommand(command, { background: false });
}

/**
 * Generate a service token from a Factorio.com username + password.
 * The password is written to a temp file and passed to curl via
 * `--data-binary @file`, so it never appears on the command line.
 */
export async function generateToken(username: string, password: string): Promise<LoginResult> {
    const body = [
        'username=' + encodeURIComponent(username),
        'password=' + encodeURIComponent(password),
        'api_version=6',
        'require_game_ownership=true'
    ].join('&');

    await Neutralino.filesystem.writeFile(BODY_FILE, body);

    try {
        const res = await exec(`curl -sS -X POST --data-binary @${BODY_FILE} ${AUTH_URL}`);

        if (res.exitCode !== 0) {
            throw new Error(res.stdErr || res.stdOut || `curl exited with code ${res.exitCode}`);
        }

        let data: any;
        try {
            data = JSON.parse(res.stdOut);
        } catch (e) {
            throw new Error(`Unexpected response from Factorio: ${res.stdOut || res.stdErr}`);
        }

        if (data.error) {
            throw new Error(data.message || data.error);
        }
        if (!data.token) {
            throw new Error('Factorio did not return a token.');
        }

        return { username: data.username || username, token: data.token };
    } finally {
        try { await Neutralino.filesystem.remove(BODY_FILE); } catch (e) {}
    }
}

/**
 * Verify that a username + token pair is accepted by Factorio's matchmaking
 * API. Returns `{ valid: true }` on success, or `{ valid: false, reason }`.
 */
export async function verifyToken(username: string, token: string): Promise<VerifyResult> {
    if (/["\r\n]/.test(username) || /["\r\n]/.test(token)) {
        return { valid: false, reason: 'Username/token contains unsupported characters.' };
    }

    const command = [
        'curl', '-sS', '--get',
        '--data-urlencode', `"username=${username}"`,
        '--data-urlencode', `"token=${token}"`,
        `"${MATCHMAKING_URL}"`
    ].join(' ');

    const res = await exec(command);

    if (res.exitCode !== 0) {
        return { valid: false, reason: res.stdErr || `curl exited with code ${res.exitCode}` };
    }

    try {
        const data = JSON.parse(res.stdOut);
        if (Array.isArray(data)) return { valid: true };
        return { valid: false, reason: data.message || 'Token rejected by Factorio' };
    } catch (e) {
        return { valid: false, reason: res.stdOut || res.stdErr || 'Invalid response from Factorio' };
    }
}
