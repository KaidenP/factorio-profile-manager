import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateToken, verifyToken } from '../src/factorioApi';

const filesystem = {
    writeFile: vi.fn(),
    remove: vi.fn(),
};
const os = {
    execCommand: vi.fn(),
};

beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as any).Neutralino = { filesystem, os };
});

describe('generateToken', () => {
    it('posts credentials and returns the generated token', async () => {
        filesystem.writeFile.mockResolvedValueOnce(undefined);
        filesystem.remove.mockResolvedValueOnce(undefined);
        os.execCommand.mockResolvedValueOnce({
            exitCode: 0,
            stdOut: JSON.stringify({ token: 'abc123', username: 'alice' }),
            stdErr: '',
        });

        const result = await generateToken('alice', 'p@ss w0rd');

        expect(filesystem.writeFile).toHaveBeenCalledWith(
            'fpm_auth_body.txt',
            'username=alice&password=p%40ss%20w0rd&api_version=6&require_game_ownership=true'
        );
        expect(os.execCommand).toHaveBeenCalledWith(
            'curl -sS -X POST --data-binary @fpm_auth_body.txt https://auth.factorio.com/api-login',
            { background: false }
        );
        expect(result).toEqual({ username: 'alice', token: 'abc123' });
        expect(filesystem.remove).toHaveBeenCalledWith('fpm_auth_body.txt');
    });

    it('throws the Factorio error message on login failure', async () => {
        filesystem.writeFile.mockResolvedValueOnce(undefined);
        filesystem.remove.mockResolvedValueOnce(undefined);
        os.execCommand.mockResolvedValueOnce({
            exitCode: 0,
            stdOut: JSON.stringify({ error: 'login-failed', message: 'Bad credentials' }),
            stdErr: '',
        });

        await expect(generateToken('alice', 'wrong')).rejects.toThrow('Bad credentials');
        expect(filesystem.remove).toHaveBeenCalledWith('fpm_auth_body.txt');
    });

    it('throws when curl itself fails', async () => {
        filesystem.writeFile.mockResolvedValueOnce(undefined);
        filesystem.remove.mockResolvedValueOnce(undefined);
        os.execCommand.mockResolvedValueOnce({ exitCode: 7, stdOut: '', stdErr: 'connection failed' });

        await expect(generateToken('alice', 'p')).rejects.toThrow('connection failed');
    });
});

describe('verifyToken', () => {
    it('returns valid for an array response', async () => {
        os.execCommand.mockResolvedValueOnce({ exitCode: 0, stdOut: '[]', stdErr: '' });

        const result = await verifyToken('alice', 'tok1');

        expect(result).toEqual({ valid: true });
        expect(os.execCommand).toHaveBeenCalledWith(
            'curl -sS --get --data-urlencode "username=alice" --data-urlencode "token=tok1" "https://multiplayer.factorio.com/get-games"',
            { background: false }
        );
    });

    it('returns invalid with reason on rejection', async () => {
        os.execCommand.mockResolvedValueOnce({
            exitCode: 0,
            stdOut: JSON.stringify({ message: "Token doesn't match." }),
            stdErr: '',
        });

        const result = await verifyToken('alice', 'tok1');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe("Token doesn't match.");
    });

    it('rejects unsupported characters without calling curl', async () => {
        const result = await verifyToken('al"ice', 'tok1');

        expect(result.valid).toBe(false);
        expect(os.execCommand).not.toHaveBeenCalled();
    });
});
