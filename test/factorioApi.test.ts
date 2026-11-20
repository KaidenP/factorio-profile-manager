import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateToken, verifyToken, listAvailableVersions, downloadVersion } from '../src/factorioApi';

const net = {
    get: vi.fn(),
    request: vi.fn(),
};
const os = {
    execCommand: vi.fn(),
};

beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as any).Neutralino = { net, os };
});

describe('generateToken', () => {
    it('posts credentials over the internal net API and returns the token', async () => {
        net.request.mockResolvedValueOnce({
            status: 200,
            body: JSON.stringify({ token: 'abc123', username: 'alice' }),
        });

        const result = await generateToken('alice', 'p@ss w0rd');

        expect(net.request).toHaveBeenCalledWith('https://auth.factorio.com/api-login', 'POST', {
            body: 'username=alice&password=p%40ss%20w0rd&api_version=6&require_game_ownership=true',
            contentType: 'application/x-www-form-urlencoded',
        });
        expect(result).toEqual({ username: 'alice', token: 'abc123' });
    });

    it('throws the Factorio error message on login failure', async () => {
        net.request.mockResolvedValueOnce({
            status: 200,
            body: JSON.stringify({ error: 'login-failed', message: 'Bad credentials' }),
        });

        await expect(generateToken('alice', 'wrong')).rejects.toThrow('Bad credentials');
    });
});

describe('verifyToken', () => {
    it('returns valid for an array response', async () => {
        net.get.mockResolvedValueOnce({ status: 200, body: '[]' });

        const result = await verifyToken('alice', 'tok1');

        expect(result).toEqual({ valid: true });
        expect(net.get).toHaveBeenCalledWith('https://multiplayer.factorio.com/get-games?username=alice&token=tok1');
    });

    it('returns invalid with reason on rejection', async () => {
        net.get.mockResolvedValueOnce({ status: 200, body: JSON.stringify({ message: "Token doesn't match." }) });

        const result = await verifyToken('alice', 'tok1');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe("Token doesn't match.");
    });

    it('rejects unsupported characters without calling the API', async () => {
        const result = await verifyToken('al"ice', 'tok1');

        expect(result.valid).toBe(false);
        expect(net.get).not.toHaveBeenCalled();
    });
});

describe('listAvailableVersions', () => {
    it('parses the stable/experimental release map', async () => {
        net.get.mockResolvedValueOnce({
            status: 200,
            body: JSON.stringify({
                stable: { alpha: '2.1.24', expansion: '2.1.24' },
                experimental: { alpha: '2.1.25', expansion: '2.1.25' },
            }),
        });

        const result = await listAvailableVersions();

        expect(result.stable.expansion).toBe('2.1.24');
        expect(result.experimental.expansion).toBe('2.1.25');
        expect(net.get).toHaveBeenCalledWith('https://factorio.com/api/latest-releases');
    });
});

describe('downloadVersion', () => {
    it('downloads via curl and resolves on success', async () => {
        os.execCommand.mockResolvedValueOnce({ exitCode: 0, stdOut: '', stdErr: '' });

        await downloadVersion('2.1.24', 'expansion', 'win64-manual', 'alice', 'tok', 'factorio_download.zip');

        expect(os.execCommand).toHaveBeenCalledWith(
            'curl -sS -L -o "factorio_download.zip" "https://www.factorio.com/get-download/2.1.24/expansion/win64-manual?username=alice&token=tok"',
            { background: false }
        );
    });

    it('throws when curl exits non-zero', async () => {
        os.execCommand.mockResolvedValueOnce({ exitCode: 22, stdOut: '', stdErr: '404 not found' });

        await expect(downloadVersion('2.1.24', 'expansion', 'win64-manual', 'alice', 'tok', 'f.zip'))
            .rejects.toThrow('404 not found');
    });
});
