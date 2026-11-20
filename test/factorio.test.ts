import { describe, it, expect, vi, beforeEach } from 'vitest';
import Factorio from '../src/factorio';
import type { Profile } from '../src/types';

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
        filesystem, os, resources, appExit, dialog,
        Neutralino: { filesystem, os, resources, app: { exit: appExit } },
    };
}

const profile = (overrides: Partial<Profile> = {}): Profile => ({
    id: 'myprofile', name: 'My Profile', lastRun: 0, totalRuns: 0, version: '2.1.24', ...overrides
});

function mockValidVersion(mocks: ReturnType<typeof makeNeutralino>, version = '2.1.24', exeSize = 49_415_632): void {
    mocks.filesystem.getStats.mockImplementation(async (path: string) => {
        if (path === `versions/${version}/data`) return { size: 1, isFile: false, isDirectory: true };
        if (path === `versions/${version}/bin/x64/factorio.exe`) return { size: exeSize, isFile: true, isDirectory: false };
        throw new Error(`unexpected stats: ${path}`);
    });
    mocks.filesystem.readDirectory.mockImplementation(async (path: string) => {
        if (path === `versions/${version}/bin`) return [{ entry: 'x64', path: `versions/${version}/bin/x64`, type: 'DIRECTORY' }];
        throw new Error(`unexpected readDirectory: ${path}`);
    });
}

describe('Factorio.launch', () => {
    let f: Factorio;
    let mocks: ReturnType<typeof makeNeutralino>;

    beforeEach(() => {
        mocks = makeNeutralino();
        (globalThis as any).Neutralino = mocks.Neutralino;
        f = new Factorio({ ui: { dialog: mocks.dialog }, exit: mocks.appExit });
    });

    it('writes service-token as login.token (not login.username)', async () => {
        mockValidVersion(mocks);
        mocks.filesystem.readFile.mockImplementation(async (path: string) => {
            if (path === 'profile/myprofile/player-data.json') throw new Error('not found');
            if (path === 'versions/2.1.24/config/config.ini') return 'write-data=default';
            throw new Error(`unexpected read: ${path}`);
        });

        await f.launch(profile(), { username: 'alice', token: 'SECRET' });

        const playerDataCall = mocks.filesystem.writeFile.mock.calls.find(c => c[0] === 'profile/myprofile/player-data.json');
        expect(playerDataCall).toBeTruthy();
        const written = JSON.parse(playerDataCall![1]);
        expect(written['service-username']).toBe('alice');
        expect(written['service-token']).toBe('SECRET');
    });

    it('writes player-data.json to the profile write-data directory', async () => {
        mockValidVersion(mocks);
        mocks.filesystem.readFile.mockImplementation(async (path: string) => {
            if (path === 'profile/myprofile/player-data.json') throw new Error('not found');
            if (path === 'versions/2.1.24/config/config.ini') return 'write-data=default';
            throw new Error(`unexpected read: ${path}`);
        });

        await f.launch(profile(), { username: 'alice', token: 'SECRET' });

        expect(mocks.filesystem.writeFile).toHaveBeenCalledWith('profile/myprofile/player-data.json', expect.any(String));
    });

    it('merges credentials into an existing player-data.json', async () => {
        mockValidVersion(mocks);
        mocks.filesystem.readFile.mockImplementation(async (path: string) => {
            if (path === 'profile/myprofile/player-data.json') return '{"existing": true}';
            if (path === 'versions/2.1.24/config/config.ini') return 'write-data=default';
            throw new Error(`unexpected read: ${path}`);
        });

        await f.launch(profile(), { username: 'alice', token: 'SECRET' });

        const call = mocks.filesystem.writeFile.mock.calls.find(c => c[0] === 'profile/myprofile/player-data.json');
        const written = JSON.parse(call![1]);
        expect(written.existing).toBe(true);
        expect(written['service-username']).toBe('alice');
    });

    it('rewrites write-data in the version config.ini to point at the profile', async () => {
        mockValidVersion(mocks);
        mocks.filesystem.readFile.mockImplementation(async (path: string) => {
            if (path === 'versions/2.1.24/config/config.ini') return 'write-data=__PATH__executable__\\default';
            throw new Error(`unexpected read: ${path}`);
        });

        await f.launch(profile());

        const configCall = mocks.filesystem.writeFile.mock.calls.find(c => c[0] === 'versions/2.1.24/config/config.ini');
        expect(configCall).toBeTruthy();
        expect(configCall![1]).toContain('write-data=__PATH__executable__\\..\\..\\..\\..\\profile\\myprofile');
    });

    it('does not launch and warns when the profile version is not installed', async () => {
        mocks.filesystem.getStats.mockRejectedValueOnce(new Error('no data dir')); // detectVersion -> null

        await f.launch(profile());

        expect(mocks.os.execCommand).not.toHaveBeenCalled();
        expect(mocks.appExit).not.toHaveBeenCalled();
        expect(mocks.dialog).toHaveBeenCalled();
    });

    it('launches factorio.exe and exits the app', async () => {
        mockValidVersion(mocks);
        mocks.filesystem.readFile.mockImplementation(async (path: string) => {
            if (path === 'versions/2.1.24/config/config.ini') return 'write-data=default';
            throw new Error(`unexpected read: ${path}`);
        });

        await f.launch(profile());

        expect(mocks.os.execCommand).toHaveBeenCalledWith(
            expect.stringContaining('versions/2.1.24/bin/x64/factorio.exe'),
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
        mocks.filesystem.readDirectory.mockImplementation(async (path: string) => {
            if (path === 'versions') return [{ entry: '2.1.24', path: 'versions/2.1.24', type: 'DIRECTORY' }];
            if (path === 'versions/2.1.24/bin') return [{ entry: 'x64', path: 'versions/2.1.24/bin/x64', type: 'DIRECTORY' }];
            throw new Error(`unexpected readDirectory: ${path}`);
        });
        mocks.filesystem.getStats.mockImplementation(async (path: string) => {
            if (path === 'versions/2.1.24/data') return { size: 1, isFile: false, isDirectory: true };
            if (path === 'versions/2.1.24/bin/x64/factorio.exe') return { size: 49_415_632, isFile: true, isDirectory: false };
            throw new Error(`unexpected stats: ${path}`);
        });

        const result = await f.detect();

        expect(result).toBe(true);
        expect(f.path).toBe('versions/2.1.24/bin/x64/factorio.exe');
    });

    it('returns false when no versions directory exists', async () => {
        mocks.filesystem.readDirectory.mockRejectedValueOnce(new Error('no versions dir'));

        const result = await f.detect();

        expect(result).toBe(false);
        expect(f.path).toBeNull();
    });

    it('returns false when the install is partial (data missing)', async () => {
        mocks.filesystem.readDirectory.mockImplementation(async (path: string) => {
            if (path === 'versions') return [{ entry: '2.1.24', path: 'versions/2.1.24', type: 'DIRECTORY' }];
            throw new Error(`unexpected readDirectory: ${path}`);
        });
        mocks.filesystem.getStats.mockRejectedValueOnce(new Error('no data dir'));

        const result = await f.detect();

        expect(result).toBe(false);
        expect(f.path).toBeNull();
    });

    it('returns false when the executable is suspiciously small', async () => {
        mocks.filesystem.readDirectory.mockImplementation(async (path: string) => {
            if (path === 'versions') return [{ entry: '2.1.24', path: 'versions/2.1.24', type: 'DIRECTORY' }];
            if (path === 'versions/2.1.24/bin') return [{ entry: 'x64', path: 'versions/2.1.24/bin/x64', type: 'DIRECTORY' }];
            throw new Error(`unexpected readDirectory: ${path}`);
        });
        mocks.filesystem.getStats.mockImplementation(async (path: string) => {
            if (path === 'versions/2.1.24/data') return { size: 1, isFile: false, isDirectory: true };
            if (path === 'versions/2.1.24/bin/x64/factorio.exe') return { size: 123, isFile: true, isDirectory: false };
            throw new Error(`unexpected stats: ${path}`);
        });

        const result = await f.detect();

        expect(result).toBe(false);
        expect(f.path).toBeNull();
    });

    it('parses a version from a Factorio zip file name', () => {
        expect(f.parseVersionFromZip('C:/Users/x/Downloads/factorio-space-age_win_2.1.24.zip')).toBe('2.1.24');
        expect(() => f.parseVersionFromZip('C:/Users/x/Downloads/not-a-factorio.zip')).toThrow();
    });
});
