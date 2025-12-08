import UI from './ui';
import * as Neutralino from "@neutralinojs/lib"
import Factorio from "./factorio";

(new (class Application {
    _profile_data = null;
    get profileData() { if (!this._profile_data) throw new Error('Profile data is not loaded yet'); return this._profile_data; }
    _selected_profile = null;
    __dirty = false;
    get _dirty() {
        return this.__dirty;
    }
    set _dirty(value) {
        if (!value) this.__dirty = false;

        this.__dirty = true;
        this.save()
    }
    factorio = null;
    constructor() {
        window.App = this
        window.Neutralino = Neutralino;

        this.ui = UI;
        this.factorio = new Factorio(this);

        Neutralino.init()
        UI(this);
        document.addEventListener('contextmenu', event => event.preventDefault());

        (async () => {
            await this.load();
            await this.factorio.checkInstalled();
        })();
    }

    _lock = false;

    async load(forceReload = false) {
        // If data is already loaded, return it immediately
        if (this._profile_data && !forceReload) return this._profile_data;

        if (this._lock) return;
        this._lock = true;

        try {
            this._profile_data = JSON.parse(await Neutralino.storage.getData('profile_data'))
            this._dirty = false;
        } catch (e) {
            console.warn("Failed to load data due to:", e);
            console.warn("Setting up default data instead")
            this._dirty = true
            this._profile_data = []
        }

        this._lock = false;

        if (!this._selected_profile) {
            for (let i = 0; i < this._profile_data.length; i++) {
                if (this._profile_data[i].selected) {
                    this._selected_profile = this._profile_data[i].id;
                    break;
                }
            }
            if (!this._selected_profile && this._profile_data.length > 0) {
                this._selected_profile = this._profile_data[0].id;
                this._profile_data[0].selected = true;
                this._dirty = true;
            }
        }

        this.render();
        return this._profile_data
    }

    async save() {
        if (this._lock) return;
        this._lock = true;

        await Neutralino.storage.setData('profile_data', JSON.stringify(this._profile_data))
        this._dirty = false;
        this._lock = false;
    }

    _lastSort = { field: null, order: null };
    sort(field, order = 'desc') {
        if (!this._profile_data) throw new Error('Profile data is not loaded yet');
        this._dirty = true;
        this._lastSort = { field, order };

        this._profile_data = this._profile_data.sort((a, b) => {
            let valA = a[field];
            let valB = b[field];

            switch (field) {
                case 'totalRuns':
                case 'lastRun':
                    return order === 'asc' ? valA - valB : valB - valA;
                case 'name':
                    if (valA < valB) return order === 'asc' ? -1 : 1;
                    if (valA > valB) return order === 'asc' ? 1 : -1;
                    return 0;
                default:
                    throw new Error(`Invalid sort field: ${field}`);
            }
        });

        this.render();
        return this._profile_data;
    }

    get selectedProfile() { return this._selected_profile; }
    set selectedProfile(id) {
        this._dirty = true;
        this._selected_profile = null;
        for (let i = 0; i < this._profile_data.length; i++) {
            if (this._profile_data[i].id === id) {
                this._profile_data[i].selected = true;
                this._selected_profile = id;
            } else delete this._profile_data[i].selected;
        }

        if (!this._selected_profile) {
            console.warn('No profile selected. Selecting first profile.');
            this._selected_profile = this._profile_data[0].id;
        }
    }


    duplicate = null;
    async addProfile(name, id) {
        if (!this._profile_data) throw new Error('Profile data is not loaded yet');

        // Check for duplicate ID
        if (this._profile_data.some(p => p.id === id)) {
            throw new Error('Profile with this ID or Name already exists');
        }

        if (!this.duplicate) {
            await Neutralino.filesystem.createDirectory(await Neutralino.filesystem.getJoinedPath('profile', id))
        } else {
            await Neutralino.filesystem.copy(
                await Neutralino.filesystem.getJoinedPath('profile', this.duplicate),
                await Neutralino.filesystem.getJoinedPath('profile', id)
            )
        }
        this._profile_data.push({
            id,
            name,
            lastRun: 0,
            totalRuns: 0
        });
        this._dirty = true;
        this.render();
    }

    deleteProfile(id) {
        if (!this._profile_data) throw new Error('Profile data is not loaded yet');

        UI.dialog('Are you sure you want to delete this profile? This action cannot be undone.', [
            {text: 'Cancel', primary: true},
            {text: 'Delete Profile', onClick: async () => {
                this._profile_data = this._profile_data.filter(p => p.id !== id);
                if (this._selected_profile === id) this._selected_profile = null;
                this._dirty = true;
                this.render();

                await Neutralino.filesystem.remove(await Neutralino.filesystem.getJoinedPath('profile', id))
        }}])
    }

    _closing = undefined;
    async exit() {
        if (this._closing) return;
        this._closing = true;
        if (this._dirty) await this.save();
        await Neutralino.app.exit();
    }

    render() {
        UI.table.renderTable(this.profileData);
    }

    /**
     * Launches a profile.
     * @param {String} profile
     * @param {String} [username]
     * @returns {Promise<void>}
     */
    async launch(username) {
        await this.factorio.launch(this.selectedProfile);
    }
})());


// (async function() {
//     document.addEventListener('contextmenu', event => event.preventDefault());
//     app.load(profile_data => {
//
//
//         setupSorting();
//         setupSearch();
//         renderTable(profile_data);
//         setupWindowBar();
//         setupFooterActions();
//     })
// })();