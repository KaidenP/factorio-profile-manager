import { dialog } from "./dialog";
import { escapeHtml } from "../util/util";
import { listAvailableVersions } from "../factorioApi";
import type { Profile, Login } from "../types";

let app: any;

const el = {
    addProfileModal: document.getElementById('addProfileModal')!,
    infoModal: document.getElementById('infoModal')!,
    addProfileBtn: document.getElementById('addProfileBtn')!,
    closeSpans: document.querySelectorAll('.close-modal'),
    saveNewProfileBtn: document.getElementById('saveNewProfileBtn')!,
    launchProfileBtn: document.getElementById('launchProfileBtn')!,
    versionsBtn: document.getElementById('versionsBtn')!,
    warningEl: document.getElementById('profileWarning')!,
    nameInput: document.getElementById('newProfileName') as HTMLInputElement,
    id: document.getElementById('newProfileId') as HTMLInputElement,
    fromProfile: document.getElementById('fromProfile') as HTMLInputElement,
    versionSelect: document.getElementById('newProfileVersion') as HTMLSelectElement,

    infoProfileName: document.getElementById('infoProfileName')!,
    infoProfileId: document.getElementById('infoProfileId')!,
    infoProfileVersion: document.getElementById('infoProfileVersion')!,
    infoModList: document.getElementById('infoModList')!,
};

export async function openNewProfileModal(name = '', id = '', fromProfile = ''): Promise<void> {
    el.warningEl.style.display = 'none';
    el.addProfileModal.style.display = 'flex';
    el.nameInput.focus();

    el.nameInput.value = name;
    el.id.value = id;
    el.fromProfile.value = fromProfile;

    const versions = await app.getInstalledVersions();
    el.versionSelect.innerHTML = '';
    if (versions.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No versions installed';
        el.versionSelect.appendChild(opt);
    } else {
        versions.forEach((v: string) => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            el.versionSelect.appendChild(opt);
        });
    }

    // When duplicating, default to the source profile's version.
    if (fromProfile) {
        const src = app.profileData.find((p: Profile) => p.id === fromProfile);
        if (src?.version) el.versionSelect.value = src.version;
    }
}

export async function openVersionsModal(): Promise<void> {
    const versions = await app.factorio.getInstalledVersions();
    const listHtml = versions.length === 0
        ? '<p class="empty-text">No versions installed.</p>'
        : versions.map((v: string) => `
            <div class="version-row" data-version="${escapeHtml(v)}">
                <span>Factorio ${escapeHtml(v)}</span>
                <button class="action-btn delete-btn version-delete">Delete</button>
            </div>
        `).join('');

    dialog(`
        <h2>Factorio Versions</h2>
        <p>Installed versions are shared across profiles. Install once, then assign it to any number of profiles.</p>
        <div id="versionsList" class="versions-list">${listHtml}</div>
    `, [
        {text: 'Download Version…', primary: true, onClick: () => openDownloadModal()},
        {text: 'Install From ZIP…', onClick: () => app.factorio.install()},
        {text: 'Close'}
    ], true);

    document.querySelectorAll('.version-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = (e.target as HTMLElement).closest('.version-row') as HTMLElement;
            const v = row.dataset.version!;
            const inUse = app.profileData.some((p: Profile) => p.version === v);
            if (inUse) {
                alert(`Cannot delete Factorio ${v}: it is still used by a profile.`);
                return;
            }
            dialog(`Delete Factorio ${v}? This frees its disk space.`, [
                {text: 'Cancel', primary: true},
                {text: 'Delete', onClick: async () => {
                    await Neutralino.filesystem.remove(app.factorio.getVersionPath(v));
                    openVersionsModal();
                }}
            ], true);
        });
    });
}

export async function openDownloadModal(): Promise<void> {
    let releases: any;
    try {
        releases = await listAvailableVersions();
    } catch (e) {
        dialog(`<p>Failed to fetch available versions:</p><pre>${escapeHtml(e?.message || e)}</pre>`, [{text: 'OK', primary: true}], true);
        return;
    }

    const builds = [
        { value: 'expansion', label: 'Space Age (expansion)' },
        { value: 'alpha', label: 'Base game (alpha)' },
    ];

    const buildOptions = builds.map(b => {
        const stable = releases.stable?.[b.value] ?? '';
        const experimental = releases.experimental?.[b.value] ?? '';
        return `<option value="${b.value}" data-stable="${escapeHtml(stable)}" data-experimental="${escapeHtml(experimental)}">${b.label}</option>`;
    }).join('');

    dialog(`
        <h2>Download Factorio</h2>
        <p>Downloads the Windows ZIP using your active account. This is a multi-GB download.</p>
        <div class="form-group">
            <label for="dlBuild">Build</label>
            <select id="dlBuild">${buildOptions}</select>
        </div>
        <div class="form-group">
            <label for="dlVersion">Version</label>
            <select id="dlVersion"></select>
        </div>
    `, [
        {text: 'Cancel'},
        {text: 'Download', primary: true, onClick: () => {
            const build = (document.getElementById('dlBuild') as HTMLSelectElement).value;
            const version = (document.getElementById('dlVersion') as HTMLSelectElement).value;
            if (!version) {
                alert('Select a version.');
                return;
            }
            const login = app.logins?.activeLogin;
            // Fire-and-forget so the dialog closes before the download starts.
            app.factorio.downloadAndInstall(version, build, login);
        }}
    ], true);

    const buildSel = document.getElementById('dlBuild') as HTMLSelectElement;
    const populate = () => {
        const opt = buildSel.selectedOptions[0];
        const vSel = document.getElementById('dlVersion') as HTMLSelectElement;
        vSel.innerHTML = '';
        const stable = opt?.dataset.stable;
        const experimental = opt?.dataset.experimental;
        if (stable) {
            const o = document.createElement('option');
            o.value = stable;
            o.textContent = `Stable ${stable}`;
            vSel.appendChild(o);
        }
        if (experimental && experimental !== stable) {
            const o = document.createElement('option');
            o.value = experimental;
            o.textContent = `Experimental ${experimental}`;
            vSel.appendChild(o);
        }
    };
    buildSel.addEventListener('change', populate);
    populate();
}

export function showInfoModal(profile: Profile): void {
    el.infoProfileName.textContent = profile.name;
    el.infoProfileId.textContent = profile.id;
    el.infoProfileVersion.textContent = profile.version || 'Not set';
    el.infoModList.innerHTML = '';

    // Mock Mod Data (Replace with real data from profile later)
    const mods = [
        {name: "base", enabled: true},
        {name: "factorio-standard-library", enabled: true},
        {name: "space-exploration", enabled: true},
        {name: "krastorio2", enabled: false},
        {name: "fneic", enabled: true},
        {name: "helmod", enabled: true},
        {name: "ltn", enabled: false},
        {name: "jetpack", enabled: true}
    ];

    mods.forEach(mod => {
        const div = document.createElement('div');
        div.className = 'mod-item';
        div.innerHTML = `
                <input type="checkbox" ${mod.enabled ? 'checked' : ''}>
                <label>${mod.name}</label>
            `;
        el.infoModList.appendChild(div);
    });

    el.infoModal.style.display = 'flex';
}

export function init(APP: any): void {
    app = APP;

    el.addProfileBtn.addEventListener('click', () => openNewProfileModal());
    el.versionsBtn.addEventListener('click', () => openVersionsModal());

    // Close Modals
    function closeModal() {
        el.infoModal.style.display = 'none';
        el.addProfileModal.style.display = 'none';
    }
    el.closeSpans.forEach(span => {
        span.addEventListener('click', () => closeModal());
    });

    window.addEventListener('click', (event) => {
        if (event.target === el.addProfileModal || event.target === el.infoModal) closeModal();
    });

    // Save New Profile
    el.saveNewProfileBtn.addEventListener('click', () => {
        const name = el.nameInput.value;
        const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
        const id_orig: string = el.id.value;
        let id: string = id_orig;

        if (!name) {
            alert("Profile Name is required!");
            return;
        }
        if (!id) {
            id = sanitize(name);
        } else id = sanitize(id);

        let append = '';
        while (app.profileData.some((p: Profile) => p.id === (id + append))) {
            append = '-' + Math.random().toString(36).slice(2);
        }

        id += append;

        if (id !== id_orig) {
            el.id.value = id;
            el.warningEl.style.display = 'block';
            return;
        }

        const version = el.versionSelect.value;
        if (!version) {
            alert("Select a Factorio version. If none are listed, install one via the Versions button.");
            return;
        }

        let fromProfile: string | null = el.fromProfile.value;
        if (fromProfile === '') {
            fromProfile = null;
        }

        app.addProfile(name, id, version, fromProfile);

        el.addProfileModal.style.display = 'none';

        // Clear form
        el.nameInput.value = '';
        el.id.value = '';
    });

    // Launch Profile
    el.launchProfileBtn.addEventListener('click', async () => {
        if (!app.selectedProfile) {
            alert("Please select a profile to launch.");
            return;
        }

        // The active account is selected from the title-bar dropdown / Manage Logins.
        const active = app.logins?.activeLogin;
        const login: Login | null = active ? { username: active.username, token: active.token } : null;

        try {
            await app.launch(login);
        } catch (e) {
            dialog(`<p>Failed to launch profile:</p><pre>${e?.message || e}</pre>`, [{text: 'OK', primary: true}], true);
        }
    });

    // Open Profile Folder
    el.infoProfileId.addEventListener('click', async () => {
        await Neutralino.os.open(await Neutralino.filesystem.getJoinedPath(NL_CWD, 'profile', el.infoProfileId.textContent));
    });
}
