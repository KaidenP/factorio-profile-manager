import { describe, it, expect, vi, beforeEach } from 'vitest';
import Factorio from '../src/factorio';

function makeNeutralino() {
    const filesystem = {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        readDirectory: vi.fn(),
        getStats: vi.fn(),
        getJoinedPath: vi.fn(async (...p: string[]) => p.join('/')),
        remove: vi.fn(async () => undefined),
        createDirectory: vi.fn(async () => undefined),
    };
    const os = {
        execCommand: vi.fn(async () => ({ exitCode: 0, stdOut: '', stdErr: '' })),
        showOpenDialog: vi.fn(),
        getPath: vi.fn(),
    };
    const resources = { readFile: vi.fn() };
    const appExit = vi.fn();
    const dialog = vi.fn();

    return {
        filesystem,
        os,
        resources,
        appExit,
        dialog,
        Neutralino: { filesystem, os, resources, app: { exit: appExit } },
    };
}

describe('Factorio.launch', () => {
    let f: Factorio;
    let mocks: ReturnType<typeof makeNeutralino>;

    beforeEach(() => {
        mocks = makeNeutralino();
        (globalThis as any).Neutralino = mocks.Neutralino;
        f = new Factorio({ ui: { dialog: mocks.dialog }, exit: mocks.appExit });
        f.path = 'factorio/bin/x64/factorio.exe';
    });

    it('writes service-token as login.token (not login.username)', async () => {
        mocks.filesystem.readFile.mockImplementation(async (path: string) => {
            if (path === 'factorio/config/player-data.json') throw new Error('not found');
            if (path === 'factorio/config/config.ini') return 'write-data=default';
            throw new Error(`unexpected read: ${path}`);
        });

        await f.launch('myprofile', { username: 'alice', token: 'SECRET' });

        const playerDataCall = mocks.filesystem.writeFile.mock.calls.find(c => c[0] === 'factorio/config/player-data.json');
        expect(playerDataCall).toBeTruthy();
        const written = JSON.parse(playerDataCall![1]);
        expect(written['service-username']).toBe('alice');
        expect(written['service-token']).toBe('SECRET');
    });

    it('writes player-data.json to the Factorio config directory', async () => {
        mocks.filesystem.readFile.mockImplementation(async (path: string) => {
            if (path === 'factorio/config/player-data.json') throw new Error('not found');
            if (path === 'factorio/config/config.ini') return 'write-data=default';
            throw new Error(`unexpected read: ${path}`);
        });

        await f.launch('myprofile', { username: 'alice', token: 'SECRET' });

        expect(mocks.filesystem.writeFile).toHaveBeenCalledWith(
            'factorio/config/player-data.json',
            expect.any(String)
        );
    });

    it('merges credentials into an existing player-data.json', async () => {
        mocks.filesystem.readFile.mockImplementation(async (path: string) => {
            if (path === 'factorio/config/player-data.json') return '{"existing": true}';
            if (path === 'factorio/config/config.ini') return 'write-data=default';
            throw new Error(`unexpected read: ${path}`);
        });

        await f.launch('myprofile', { username: 'alice', token: 'SECRET' });

        const playerDataCall = mocks.filesystem.writeFile.mock.calls.find(c => c[0] === 'factorio/config/player-data.json');
        const written = JSON.parse(playerDataCall![1]);
        expect(written.existing).toBe(true);
        expect(written['service-username']).toBe('alice');
    });

    it('rewrites write-data in config.ini to point at the profile', async () => {
        mocks.filesystem.readFile.mockImplementation(async (path: string) => {
            if (path === 'factorio/config/config.ini') return 'write-data=__PATH__executable__\\default';
            throw new Error(`unexpected read: ${path}`);
        });

        await f.launch('myprofile');

        const configCall = mocks.filesystem.writeFile.mock.calls.find(c => c[0] === 'factorio/config/config.ini');
        expect(configCall).toBeTruthy();
        expect(configCall![1]).toContain('write-data=__PATH__executable__\\..\\..\\..\\profile\\myprofile');
    });

    it('does not launch and warns when Factorio is not installed', async () => {
        f.path = null;
        mocks.filesystem.readDirectory.mockResolvedValueOnce([]); // detect() -> false

        await f.launch('myprofile');

        expect(mocks.os.execCommand).not.toHaveBeenCalled();
        expect(mocks.appExit).not.toHaveBeenCalled();
        expect(mocks.dialog).toHaveBeenCalled();
    });

    it('launches factorio.exe and exits the app', async () => {
        mocks.filesystem.readFile.mockImplementation(async (path: string) => {
            if (path === 'factorio/config/config.ini') return 'write-data=default';
            throw new Error(`unexpected read: ${path}`);
        });

        await f.launch('myprofile');

        expect(mocks.os.execCommand).toHaveBeenCalledWith(
            expect.stringContaining('factorio/bin/x64/factorio.exe'),
            { background: true }
        );
        expect(mocks.appExit).toHaveBeenCalled();
    });
});

describe('Factorio.detect', () => {
    let f: Factorio;
    let mocks: ReturnType<typeof makeNeutralino>;

    beforeEach(() => {
        mocks = makeNeutralino();
        (globalThis as any).Neutralino = mocks.Neutralino;
        f = new Factorio({ ui: { dialog: mocks.dialog }, exit: mocks.appExit });
    });

    it('locates factorio.exe and sets the path', async () => {
        mocks.filesystem.readDirectory.mockResolvedValueOnce([
            { entry: 'x64', path: 'factorio/bin/x64', type: 'dir' }
        ]);
        mocks.filesystem.getStats.mockResolvedValueOnce({ size: 1, isFile: true, isDirectory: false });

        const result = await f.detect();

        expect(result).toBe(true);
        expect(f.path).toBe('factorio/bin/x64/factorio.exe');
    });

    it('returns false when the factorio directory is missing', async () => {
        mocks.filesystem.readDirectory.mockRejectedValueOnce(new Error('missing'));

        const result = await f.detect();

        expect(result).toBe(false);
        expect(f.path).toBeNull();
    });
});
