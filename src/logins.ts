import type { StoredLogin } from "./types";

const STORAGE_KEY = 'login_data';

/**
 * Manages saved Factorio.com logins (username + service token).
 *
 * Tokens are stored in plaintext in Neutralino's storage, mirroring how
 * Factorio itself stores `service-token` in `player-data.json`.
 */
export default class LoginManager {
    private _logins: StoredLogin[] | null = null;

    get logins(): StoredLogin[] {
        return this._logins ?? [];
    }

    get activeLogin(): StoredLogin | null {
        return this._logins?.find(l => l.selected) ?? null;
    }

    private _loadPromise: Promise<StoredLogin[]> | null = null;

    async load(forceReload = false): Promise<StoredLogin[]> {
        if (this._logins && !forceReload) return this._logins;

        if (!this._loadPromise) {
            this._loadPromise = this._loadFromStorage();
        }
        const result = await this._loadPromise;
        this._loadPromise = null;
        return result;
    }

    private async _loadFromStorage(): Promise<StoredLogin[]> {
        try {
            const raw = JSON.parse(await Neutralino.storage.getData(STORAGE_KEY));
            this._logins = Array.isArray(raw) ? raw : [];
        } catch (e) {
            console.warn('Failed to load saved logins:', e);
            this._logins = [];
        }
        return this._logins;
    }

    async save(): Promise<void> {
        await Neutralino.storage.setData(STORAGE_KEY, JSON.stringify(this.logins));
    }

    /**
     * Add (or replace, if the same username already exists) a login.
     * The first login added becomes the active (default) account.
     */
    async add(username: string, token: string): Promise<StoredLogin> {
        await this.load();

        const existing = this._logins!.find(l => l.username.toLowerCase() === username.toLowerCase());
        if (existing) {
            existing.token = token;
            await this.save();
            return existing;
        }

        const login: StoredLogin = { id: this.uniqueId(username), username, token };
        if (!this._logins!.some(l => l.selected)) {
            login.selected = true;
        }
        this._logins!.push(login);
        await this.save();
        return login;
    }

    async remove(id: string): Promise<void> {
        await this.load();
        const removed = this._logins!.find(l => l.id === id);
        this._logins = this._logins!.filter(l => l.id !== id);
        if (removed?.selected && this._logins!.length > 0) {
            this._logins![0].selected = true;
        }
        await this.save();
    }

    /** Mark one login as the active (default) account. */
    async setDefault(id: string): Promise<void> {
        await this.load();
        for (const l of this._logins!) {
            l.selected = (l.id === id);
        }
        await this.save();
    }

    private uniqueId(username: string): string {
        const base = username.toLowerCase().replace(/[^a-z0-9-_]/g, '_');
        let id = base;
        let suffix = 0;
        while (this._logins!.some(l => l.id === id)) {
            suffix++;
            id = `${base}-${suffix}`;
        }
        return id;
    }
}
