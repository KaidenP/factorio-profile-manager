const el = {
    addProfileModal: document.getElementById('addProfileModal'),
    infoModal: document.getElementById('infoModal'),
    addProfileBtn: document.getElementById('addProfileBtn'),
    closeSpans: document.querySelectorAll('.close-modal'),
    saveNewProfileBtn: document.getElementById('saveNewProfileBtn'),
    launchProfileBtn: document.getElementById('launchProfileBtn'),
    warningEl: document.getElementById('profileWarning'),
    nameInput: document.getElementById('newProfileName'),
    id: document.getElementById('newProfileId'),
    fromProfile: document.getElementById('fromProfile'),

    infoProfileName: document.getElementById('infoProfileName'),
    infoProfileId: document.getElementById('infoProfileId'),
    infoModList: document.getElementById('infoModList'),
}

export function openNewProfileModal(name = '', id = '', fromProfile = '') {
    el.warningEl.style.display = 'none';
    el.addProfileModal.style.display = 'flex';
    el.nameInput.focus();

    el.nameInput.value = name;
    el.id.value = id;
    el.fromProfile.value = fromProfile;
}

export function showInfoModal(profile) {
    el.infoProfileName.textContent = profile.name;
    el.infoProfileId.textContent = profile.id;
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

export function init(app) {// openNewProfileModal
    el.addProfileBtn.addEventListener('click', () => openNewProfileModal());

// Close Modals
    function closeModal() {
        el.infoModal.style.display = 'none';
        el.addProfileModal.style.display = 'none';
    }
    el.closeSpans.forEach(span => {
        span.addEventListener('click', () => closeModal());
    });

    window.addEventListener('click', (event) => {
        if (event.target === el.addProfileModal || event.target === el.infoModal) closeModal()
    });

// Save New Profile
    el.saveNewProfileBtn.addEventListener('click', () => {
        const name = el.nameInput.value;
        const sanitize = str => str.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
        let id_orig, id = id_orig = el.id.value;


        if (!name) {
            alert("Profile Name is required!");
            return
        }
        if (!id) {
            id = sanitize(name)
        } else id = sanitize(id)

        let append = ''
        while (app.profileData.some(p => p.id === (id + append))) {
            append = '-' + Math.random().toString(36).slice(2);
        }

        id += append;

        if (id !== id_orig) {
            el.id.value = id;
            el.warningEl.style.display = 'block';
            return;
        }

        let fromProfile = el.fromProfile.value;
        if (fromProfile === '') {
            fromProfile = null
        }

        app.addProfile(name, id, fromProfile);

        el.addProfileModal.style.display = 'none';

        // Clear form
        el.nameInput.value = '';
        el.id.value = '';
    });


// Launch Profile
    el.launchProfileBtn.addEventListener('click', () => {
        if (app.selectedProfile) {
            console.log("Launching:", app.selectedProfile);
            app.launch();
        } else {
            alert("Please select a profile to launch.");
        }
    });

    // Open Profile Folder
    el.infoProfileId.addEventListener('click', async () => {
        await Neutralino.os.open(await Neutralino.filesystem.getJoinedPath(NL_CWD, 'profile', el.infoProfileId.textContent));
    })

}
