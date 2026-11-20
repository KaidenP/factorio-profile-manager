import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readModList, writeModList, setModEnabled, removeMod, modListPath } from '../src/mods';

const fs = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    getStats: vi.fn(),
    getJoinedPath: vi.fn((...parts: string[]) => parts.join('/')),
    remove: vi.fn(),
};

beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as any).Neutralino = { filesystem: fs };
    fs.createDirectory.mockResolvedValue(undefined);
    fs.getStats.mockResolvedValue({ isDirectory: true });
});

describe('readModList', () => {
    it('parses the mods array from mod-list.json', async () => {
        fs.readFile.mockResolvedValueOnce(JSON.stringify({
            mods: [
                { name: 'base', enabled: true },
                { name: 'space-exploration', enabled: false },
            ],
        }));

        expect(await readModList('p1')).toEqual([
            { name: 'base', enabled: true },
            { name: 'space-exploration', enabled: false },
        ]);
        expect(fs.readFile).toHaveBeenCalledWith(modListPath('p1'));
    });

    it('returns [] when the list does not exist', async () => {
        fs.readFile.mockRejectedValueOnce(new Error('not found'));
        expect(await readModList('p1')).toEqual([]);
    });
});

describe('writeModList', () => {
    it('writes pretty-printed JSON and creates the mods directory', async () => {
        await writeModList('p1', [{ name: 'base', enabled: true }]);

        expect(fs.createDirectory).toHaveBeenCalledWith('profile/p1/mods');
        expect(fs.writeFile).toHaveBeenCalledWith(
            'profile/p1/mods/mod-list.json',
            JSON.stringify({ mods: [{ name: 'base', enabled: true }] }, null, 4)
        );
    });
});

describe('setModEnabled', () => {
    it('flips an existing entry', async () => {
        fs.readFile.mockResolvedValueOnce(JSON.stringify({
            mods: [{ name: 'base', enabled: true }, { name: 'foo', enabled: true }],
        }));

        await setModEnabled('p1', 'foo', false);

        const written = JSON.parse(fs.writeFile.mock.calls[0][1]);
        expect(written.mods).toEqual([
            { name: 'base', enabled: true },
            { name: 'foo', enabled: false },
        ]);
    });

    it('adds a missing entry as enabled', async () => {
        fs.readFile.mockResolvedValueOnce(JSON.stringify({
            mods: [{ name: 'base', enabled: true }],
        }));

        await setModEnabled('p1', 'new-mod', true);

        const written = JSON.parse(fs.writeFile.mock.calls[0][1]);
        expect(written.mods).toEqual([
            { name: 'base', enabled: true },
            { name: 'new-mod', enabled: true },
        ]);
    });
});

describe('removeMod', () => {
    it('deletes matching zip files and removes the list entry', async () => {
        fs.readFile.mockResolvedValueOnce(JSON.stringify({
            mods: [{ name: 'base', enabled: true }, { name: 'foo', enabled: true }],
        }));
        fs.readDirectory.mockResolvedValueOnce([
            { type: 'FILE', entry: 'foo_1.2.3.zip' },
            { type: 'FILE', entry: 'other_4.5.6.zip' },
        ]);

        await removeMod('p1', 'foo');

        expect(fs.remove).toHaveBeenCalledWith('profile/p1/mods/foo_1.2.3.zip');
        const written = JSON.parse(fs.writeFile.mock.calls[0][1]);
        expect(written.mods).toEqual([{ name: 'base', enabled: true }]);
    });

    it('refuses to remove the base mod', async () => {
        await expect(removeMod('p1', 'base')).rejects.toThrow('cannot be removed');
    });
});
