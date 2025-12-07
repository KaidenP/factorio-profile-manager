class Application {
    _profile_data = null;
    get profileData() { if (!this._profile_data) throw new Error('Profile data is not loaded yet'); return this._profile_data; }
    _selected_profile = null;
    _dirty = false;
    constructor() {
        Neutralino.init();
    }

    load(cb, forceReload = false) {
        if (typeof cb !== 'function') throw new Error('Callback is required and must be a function');

        // If data is already loaded, return it immediately
        if (this._profile_data && !forceReload) return cb(this._profile_data);

        // TODO: Fetch data from backend, currently returning sample data
        this._profile_data = [
            {
                "id": "defaultProfile",
                "name": "Default Profile",
                "lastRun": 1698244200000,
                "totalRuns": 150
            },
            {
                "id": "testEnvironment",
                "name": "Test Environment",
                "lastRun": 1698344100000,
                "totalRuns": 42
            },
            {
                "id": "productionA",
                "name": "Production A",
                "lastRun": 1697806800000,
                "totalRuns": 1205
            },
            {
                "id": "backupJob",
                "name": "Backup Job",
                "lastRun": 1698382800000,
                "totalRuns": 8
            },
            {
                "id": "analytics",
                "name": "Analytics",
                "lastRun": 1698187500000,
                "totalRuns": 300
            },
            {
                "id": "productionB",
                "name": "Production B",
                "lastRun": 1698400000000,
                "totalRuns": 998
            },
            {
                "id": "loadTesting",
                "name": "Load Testing",
                "lastRun": 1698320000000,
                "totalRuns": 75
            },
            {
                "id": "qaSuite",
                "name": "QA Suite",
                "lastRun": 1698299000000,
                "totalRuns": 214
            },
            {
                "id": "nightlyBuild",
                "name": "Nightly Build",
                "lastRun": 1698370000000,
                "totalRuns": 365
            },
            {
                "id": "archivalProcess",
                "name": "Archival Process",
                "lastRun": 1698255000000,
                "totalRuns": 58
            },
            {
                "id": "dataMigration",
                "name": "Data Migration",
                "lastRun": 1698213000000,
                "totalRuns": 19
            },
            {
                "id": "notificationService",
                "name": "Notification Service",
                "lastRun": 1698366000000,
                "totalRuns": 742
            },
            {
                "id": "integrationTestSet",
                "name": "Integration Test Set",
                "lastRun": 1698333300000,
                "totalRuns": 133
            },
            {
                "id": "reportGenerator",
                "name": "Report Generator",
                "lastRun": 1698232200000,
                "totalRuns": 450
            },
            {
                "id": "userSync",
                "name": "User Sync",
                "lastRun": 1698311000000,
                "totalRuns": 510
            },
            {
                "id": "securityScan",
                "name": "Security Scan",
                "lastRun": 1698300000000,
                "totalRuns": 322
            },
            {
                "id": "cacheRefresher",
                "name": "Cache Refresher",
                "lastRun": 1698392000000,
                "totalRuns": 88
            },
            {
                "id": "searchIndexUpdate",
                "name": "Search Index Update",
                "lastRun": 1698266000000,
                "totalRuns": 267
            },
            {
                "id": "cleanupTask",
                "name": "Cleanup Task",
                "lastRun": 1698288800000,
                "totalRuns": 39
            },
            {
                "id": "apiStressTest",
                "name": "API Stress Test",
                "lastRun": 1698357700000,
                "totalRuns": 154
            }
        ]


        this._dirty = false;
        if (!this._selected_profile) {
            for (let i = 0; i < this._profile_data.length; i++) {
                if (this._profile_data[i].selected) {
                    this._selected_profile = this._profile_data[i].id;
                    break;
                }
            }
            if (!this._selected_profile) {
                this._selected_profile = this._profile_data[0].id;
                this._profile_data[0].selected = true;
                this._dirty = true;
            }
        }
        cb(this._profile_data);
    }

    save(cb) {
        if (typeof cb !== 'function') throw new Error('Callback is required and must be a function');

        // TODO: Save data to backend
        this._dirty = false
        cb();
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

    addProfile(name, id) {
        if (!this._profile_data) throw new Error('Profile data is not loaded yet');

        // Check for duplicate ID
        if (this._profile_data.some(p => p.id === id)) {
            throw new Error('Profile with this ID or Name already exists');
        }

        this._profile_data.push({
            id,
            name,
            lastRun: 0,
            totalRuns: 0
        });
        this._dirty = true;
    }

    duplicateProfile(name, id, srcID) {
        this.addProfile(name, id);
        // TODO
        alert("Duplicate Profile not yet implemented. Created new Profile instead.")
    }

    deleteProfile(id) {
        if (!this._profile_data) throw new Error('Profile data is not loaded yet');
        this._profile_data = this._profile_data.filter(p => p.id !== id);
        if (this._selected_profile === id) this._selected_profile = null;
        this._dirty = true;
        return this._profile_data;
    }

    _closing = undefined;
    exit() {
        if (this._closing) return;
        this._closing = true;
        if (this._dirty) this.save(() => Neutralino.app.exit());
        else Neutralino.app.exit();
    }
}

const app = new Application();

document.addEventListener('contextmenu', event => event.preventDefault());

function init() {
    loadingUI.init()
    app.load(profile_data => {
        setupSorting();
        setupSearch();
        renderTable(profile_data);
        setupWindowBar();
        setupFooterActions();
    })
}

init();