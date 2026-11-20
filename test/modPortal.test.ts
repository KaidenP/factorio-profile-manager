import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchMods, installMod, releaseFromSearch } from '../src/modPortal';

const net = {
    get: vi.fn(),
    request: vi.fn(),
};
const os = {
    execCommand: vi.fn(),
};
const fs = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    getStats: vi.fn(),
    getJoinedPath: vi.fn((...parts: string[]) => parts.join('/')),
    remove: vi.fn(),
    move: vi.fn(),
};

beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as any).Neutralino = { net, os, filesystem: fs };
    fs.createDirectory.mockResolvedValue(undefined);
    fs.getStats.mockResolvedValue({ isDirectory: true });
    fs.readDirectory.mockResolvedValue([]);
});

describe('searchMods', () => {
    it('POSTs a JSON body to /api/search and returns results', async () => {
        net.request.mockResolvedValueOnce({
            status: 200,
            body: JSON.stringify({ results: [{ name: 'foo', title: 'Foo' }] }),
        });

        const results = await searchMods('foo', '2.1.24', 'alice', 'tok');

        expect(net.request).toHaveBeenCalledWith('https://mods.factorio.com/api/search', 'POST', {
            body: JSON.stringify({ version: '2.1.24', username: 'alice', token: 'tok', query: 'foo', page_size: 25, sort_attribute: 'relevancy' }),
            contentType: 'application/json',
        });
        expect(results).toEqual([{ name: 'foo', title: 'Foo' }]);
    });

    it('throws the portal error message', async () => {
        net.request.mockResolvedValueOnce({
            status: 200,
            body: JSON.stringify({ message: 'Invalid username or token' }),
        });

        await expect(searchMods('foo', '2.1.24', 'alice', 'bad')).rejects.toThrow('Invalid username or token');
    });
});

describe('releaseFromSearch', () => {
    it('builds a downloadable release from a search result id + version', () => {
        const release = releaseFromSearch({
            name: 'BottleneckLite',
            latest_release: '6a82838ec213aced43a5d085',
            latest_release_version: '1.4.1',
        });

        expect(release).toEqual({
            download_url: '/download/BottleneckLite/6a82838ec213aced43a5d085',
            file_name: 'BottleneckLite_1.4.1.zip',
            version: '1.4.1',
        });
    });

    it('returns null when the search result has no release', () => {
        expect(releaseFromSearch({ name: 'foo' })).toBeNull();
    });
});

describe('installMod', () => {
    it('downloads the zip via curl and registers the mod in mod-list.json', async () => {
        os.execCommand.mockResolvedValueOnce({ exitCode: 0, stdOut: '', stdErr: '' });
        fs.readFile.mockResolvedValueOnce(JSON.stringify({ mods: [{ name: 'base', enabled: true }] }));

        const release = {
            download_url: '/download/foo/abc123',
            file_name: 'foo_1.2.3.zip',
            version: '1.2.3',
        };

        await installMod('p1', 'foo', release, 'alice', 'tok');

        expect(os.execCommand).toHaveBeenCalledWith(
            'curl -sS -L -o "mod_download.zip" "https://mods.factorio.com/download/foo/abc123?username=alice&token=tok"',
            { background: false }
        );
        expect(fs.move).toHaveBeenCalledWith('mod_download.zip', 'profile/p1/mods/foo_1.2.3.zip');

        const written = JSON.parse(fs.writeFile.mock.calls[0][1]);
        expect(written.mods).toEqual([
            { name: 'base', enabled: true },
            { name: 'foo', enabled: true },
        ]);
    });

    it('throws when curl exits non-zero', async () => {
        os.execCommand.mockResolvedValueOnce({ exitCode: 22, stdOut: '', stdErr: '404 not found' });

        await expect(installMod('p1', 'foo', { download_url: '/download/foo/x', file_name: 'foo_1.0.0.zip', version: '1.0.0' }, 'alice', 'tok'))
            .rejects.toThrow('404 not found');
    });
});
