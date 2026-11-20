import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginManager from '../src/logins';

const storage = {
    getData: vi.fn(),
    setData: vi.fn(),
};

beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as any).Neutralino = { storage };
});

describe('LoginManager', () => {
    it('loads an empty list when nothing is stored', async () => {
        storage.getData.mockRejectedValueOnce(new Error('not found'));

        const mgr = new LoginManager();
        const logins = await mgr.load();

        expect(logins).toEqual([]);
        expect(mgr.logins).toEqual([]);
    });

    it('loads previously saved logins', async () => {
        storage.getData.mockResolvedValueOnce(JSON.stringify([
            { id: 'alice', username: 'alice', token: 'tok1' },
        ]));

        const mgr = new LoginManager();
        const logins = await mgr.load();

        expect(logins).toHaveLength(1);
        expect(logins[0].username).toBe('alice');
    });

    it('adds a new login and persists it', async () => {
        storage.getData.mockRejectedValueOnce(new Error('not found'));
        storage.setData.mockResolvedValueOnce(undefined);

        const mgr = new LoginManager();
        const login = await mgr.add('Alice', 'token-123');

        expect(login.id).toBe('alice');
        expect(login.username).toBe('Alice');
        expect(login.token).toBe('token-123');
        expect(mgr.logins).toHaveLength(1);
        expect(storage.setData).toHaveBeenCalledWith('login_data', JSON.stringify([login]));
    });

    it('replaces the token when the same username is added again', async () => {
        storage.getData.mockResolvedValueOnce(JSON.stringify([
            { id: 'alice', username: 'alice', token: 'old' },
        ]));

        const mgr = new LoginManager();
        const login = await mgr.add('Alice', 'new');

        expect(login.id).toBe('alice');
        expect(login.token).toBe('new');
        expect(mgr.logins).toHaveLength(1);
    });

    it('dedupes ids when two usernames sanitize to the same id', async () => {
        storage.getData.mockResolvedValueOnce(JSON.stringify([
            { id: 'a_b', username: 'a b', token: 't1' },
        ]));

        const mgr = new LoginManager();
        const login = await mgr.add('a_b', 't2');

        expect(login.id).toBe('a_b-1');
        expect(mgr.logins).toHaveLength(2);
    });

    it('removes a login and persists the rest', async () => {
        storage.getData.mockResolvedValueOnce(JSON.stringify([
            { id: 'alice', username: 'alice', token: 't1' },
            { id: 'bob', username: 'bob', token: 't2' },
        ]));

        const mgr = new LoginManager();
        await mgr.load();
        await mgr.remove('alice');

        expect(mgr.logins.map(l => l.id)).toEqual(['bob']);
        expect(storage.setData).toHaveBeenCalledWith(
            'login_data',
            JSON.stringify([{ id: 'bob', username: 'bob', token: 't2' }])
        );
    });
});
