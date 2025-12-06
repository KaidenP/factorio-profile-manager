// Sample Data
const app = new Application();

// Loading Modal API
const loadingUI = {
    modal: null,
    bar: null,
    text: null,
    status: null,

    init() {
        this.modal = document.getElementById('loadingModal');
        this.bar = document.getElementById('progressBar');
        this.text = document.getElementById('loadingText');
        this.status = document.getElementById('loadingStatus');
    },

    show(title = "Loading...", mode = "indeterminate") {
        if (!this.modal) this.init();
        this.modal.style.display = 'block';
        this.text.textContent = title;
        this.setMode(mode);
    },

    hide() {
        if (!this.modal) this.init();
        this.modal.style.display = 'none';
    },

    setMode(mode) { // 'determinate' or 'indeterminate'
        if (mode === 'indeterminate') {
            this.bar.classList.add('indeterminate');
            this.bar.style.width = '100%';
        } else {
            this.bar.classList.remove('indeterminate');
            this.bar.style.width = '0%';
        }
    },

    setProgress(percent, statusText) {
        if (this.bar.classList.contains('indeterminate')) {
            this.setMode('determinate');
        }
        this.bar.style.width = `${percent}%`;
        if (statusText) this.status.textContent = statusText;
    }
};

function init() {
    loadingUI.init()
    // loadingUI.show("Loading Profiles...", "indeterminate");
    //
    // // Simulate loading for demonstration
    // setTimeout(() => {
    //     loadingUI.setMode('determinate');
    //     let p = 0;
    //     const int = setInterval(() => {
    //         p += 100/50;
    //         loadingUI.setProgress(p, `Loading data chunk ${p / 2}...`);
    //         if (p >= 100) {
    //             clearInterval(int);
    //             loadingUI.hide();
    //         }
    //     }, 100);
    // }, 3000);

    app.load(profile_data => {
        setupSorting();
        setupSearch();
        renderTable(profile_data);
        setupWindowBar();
        setupFooterActions();
    })
}

let newProfileModal = null;
let duplicateMode = false

function setupFooterActions() {
    const modal = document.getElementById('addProfileModal');
    const addBtn = document.getElementById('addProfileBtn');
    const closeSpan = document.querySelector('.close-modal');
    const saveBtn = document.getElementById('saveNewProfileBtn');
    const launchBtn = document.getElementById('launchProfileBtn');
    const warningEl = document.getElementById('profileWarning');
    const nameInput = document.getElementById('newProfileName');
    const id_el = document.getElementById('newProfileId');

    newProfileModal = (name = nameInput.value, id = id_el.value) => {
        warningEl.style.display = 'none';
        modal.style.display = 'block';
        nameInput.focus();


        nameInput.value = name;
        id_el.value = id;
    }

    // Open Modal
    addBtn.addEventListener('click', () => newProfileModal());

    // Close Modal
    closeSpan.addEventListener('click', () => {
        modal.style.display = 'none';
        if (duplicateMode) {
            duplicateMode = false;

            // Clear form
            nameInput.value = '';
            id_el.value = '';
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
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

function setupWindowBar() {
    const closeBtn = document.getElementById('closeBtn');
    Neutralino.window.setDraggableRegion(document.getElementById('windowGrip'), {exclude: [closeBtn]});
    closeBtn.addEventListener('click', () => {
        app.exit();
    });
}

function renderTable(dataToRender = app.profileData) {
    const tbody = document.querySelector('#profilesTable tbody');
    tbody.innerHTML = '';

    dataToRender.forEach(profile => {
        const dateObj = new Date(profile.lastRun);
        let lastRunDate = dateObj.toLocaleDateString();
        let lastRunFull = dateObj.toLocaleString();
        const row = document.createElement('tr');
        row.dataset.id = profile.id;
        if (profile.id === app.selectedProfile) row.classList.add('selected');

        row.innerHTML = `
                <td>${profile.name}</td>
                <td title="${profile.lastRun === 0 ? "Never Ran" : lastRunFull}">${profile.lastRun === 0 ? "NEVER" : lastRunDate}</td>
                <td>
                    ${profile.totalRuns}
                    <div class="row-actions">
                        <button class="action-btn duplicate-btn" title="Duplicate Profile">🞧</button>
                        <button class="action-btn delete-btn" title="Delete Profile">🞮</button>
                    </div>
                </td>
            `;

        // Setup action buttons
        const duplicateBtn = row.querySelector('.duplicate-btn');
        const deleteBtn = row.querySelector('.delete-btn');

        duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            duplicateMode = profile.id;
            newProfileModal(profile.name + ' (Copy)', profile.id + '-copy');
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            app.deleteProfile(profile.id);
            renderTable();
        });

        row.addEventListener('click', () => {
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
            app.selectedProfile = profile.id;
        });

        tbody.appendChild(row);
    });
}

function reevaluateSearch(term = "") {
    term = term.toLowerCase();
    const filteredData = app.profileData.filter(profile =>
        profile.name.toLowerCase().includes(term)
    );
    renderTable(filteredData)
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchContainer = document.getElementById('searchContainer');
    const searchIcon = document.getElementById('searchIcon');

    searchIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent sorting when clicking the search icon
        if (searchContainer.style.display === 'none' || searchContainer.style.display === '') {
            searchContainer.style.display = 'block';
            searchInput.focus();
        } else {
            searchContainer.style.display = 'none';
        }
    });

    searchInput.addEventListener('input',
        (e) => reevaluateSearch(e.target.value));
}

function sortProfiles(th, overrideOrder = null) {
    const column = th.dataset.column;
    const currentOrder = th.dataset.order;
    const newOrder = overrideOrder || currentOrder === 'asc' ? 'desc' : 'asc';

    // Reset other headers
    document.querySelectorAll('#profilesTable th').forEach(header => {
        header.classList.remove('sorted-asc', 'sorted-desc');
    });

    app.sort(column, newOrder);

    // Update UI
    th.dataset.order = newOrder;
    th.classList.add(newOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');

    reevaluateSearch(document.getElementById('searchInput').value);
}

function setupSorting() {
    document.querySelectorAll('#profilesTable th').forEach(th => {
        // if (th.dataset.column === 'lastRun') sortProfiles(th, 'desc');
        th.addEventListener('click', () => {
            sortProfiles(th)
        });
    });
}

init();