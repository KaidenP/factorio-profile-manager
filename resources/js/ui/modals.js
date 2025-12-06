let newProfileModal = null;
let duplicateMode = false;

function setupFooterActions() {
    const modal = document.getElementById('addProfileModal');
    const infoModal = document.getElementById('infoModal');
    const addBtn = document.getElementById('addProfileBtn');
    const closeSpans = document.querySelectorAll('.close-modal');
    const saveBtn = document.getElementById('saveNewProfileBtn');
    const launchBtn = document.getElementById('launchProfileBtn');
    const warningEl = document.getElementById('profileWarning');
    const nameInput = document.getElementById('newProfileName');
    const id_el = document.getElementById('newProfileId');

    newProfileModal = (name = nameInput.value, id = id_el.value) => {
        warningEl.style.display = 'none';
        modal.style.display = 'flex';
        nameInput.focus();


        nameInput.value = name;
        id_el.value = id;
    }

    // Open Modal
    addBtn.addEventListener('click', () => newProfileModal());

    // Close Modal (Generic for all close spans)
    closeSpans.forEach(span => {
        span.addEventListener('click', () => {
            modal.style.display = 'none';
            infoModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === infoModal) {
            infoModal.style.display = 'none';
        }
    });

    // Save New Profile
    saveBtn.addEventListener('click', () => {
        const name = nameInput.value;
        const sanitize = str => str.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
        let id_orig, id = id_orig = id_el.value;


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
            id_el.value = id;
            warningEl.style.display = 'block';
            return;
        }

        if (!duplicateMode) app.addProfile(name, id);
        else app.duplicateProfile(name, id, duplicateMode);
        duplicateMode = false;

        modal.style.display = 'none';

        // Clear form
        nameInput.value = '';
        id_el.value = '';

        // Re-render table
        renderTable();
    });

    // Launch Profile
    launchBtn.addEventListener('click', () => {
        if (app.selectedProfile) {
            // TODO: Call backend to launch: app.launchProfile(app.selectedProfile);
            console.log("Launching:", app.selectedProfile);
        } else {
            alert("Please select a profile to launch.");
        }
    });
}

function showInfoModal(profile) {
    const modal = document.getElementById('infoModal');
    document.getElementById('infoProfileName').textContent = profile.name;
    document.getElementById('infoProfileId').textContent = profile.id;

    const modList = document.getElementById('infoModList');
    modList.innerHTML = '';

    // Mock Mod Data (Replace with real data from profile later)
    const mods = [
        { name: "base", enabled: true },
        { name: "factorio-standard-library", enabled: true },
        { name: "space-exploration", enabled: true },
        { name: "krastorio2", enabled: false },
        { name: "fneic", enabled: true },
        { name: "helmod", enabled: true },
        { name: "ltn", enabled: false },
        { name: "jetpack", enabled: true }
    ];

    mods.forEach(mod => {
        const div = document.createElement('div');
        div.className = 'mod-item';
        div.innerHTML = `
                <input type="checkbox" ${mod.enabled ? 'checked' : ''}>
                <label>${mod.name}</label>
            `;
        modList.appendChild(div);
    });

    modal.style.display = 'flex';
}