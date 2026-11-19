import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureDirectory } from '../src/util/util';

const filesystem = {
    createDirectory: vi.fn(),
    getStats: vi.fn(),
    remove: vi.fn(),
};

beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as any).Neutralino = { filesystem };
});

describe('ensureDirectory', () => {
    it('does nothing extra when the directory is created successfully', async () => {
        filesystem.createDirectory.mockResolvedValueOnce(undefined);

        await ensureDirectory('foo');

        expect(filesystem.createDirectory).toHaveBeenCalledWith('foo');
        expect(filesystem.getStats).not.toHaveBeenCalled();
        expect(filesystem.remove).not.toHaveBeenCalled();
    });

    it('removes and recreates the path when it exists as a file', async () => {
        filesystem.createDirectory.mockRejectedValueOnce(new Error('exists'));
        filesystem.getStats.mockResolvedValueOnce({ isDirectory: false });

        await ensureDirectory('foo');

        expect(filesystem.remove).toHaveBeenCalledWith('foo');
        expect(filesystem.createDirectory).toHaveBeenCalledTimes(2);
    });

    it('treats an existing directory as success', async () => {
        filesystem.createDirectory.mockRejectedValueOnce(new Error('exists'));
        filesystem.getStats.mockResolvedValueOnce({ isDirectory: true });

        await ensureDirectory('foo');

        expect(filesystem.remove).not.toHaveBeenCalled();
        expect(filesystem.createDirectory).toHaveBeenCalledTimes(1);
    });

    it('throws a descriptive error when the directory cannot be created or inspected', async () => {
        filesystem.createDirectory.mockRejectedValueOnce(new Error('denied'));
        filesystem.getStats.mockRejectedValueOnce(new Error('stat failed'));

        await expect(ensureDirectory('foo')).rejects.toThrow(/Failed to create directory "foo"/);
    });
});
