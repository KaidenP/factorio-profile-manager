let app;

export function renderTable(dataToRender = app.profileData) {
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
                    <td>
                    ${profile.name}
                        <div class="row-actions">
                        <button class="action-btn info-btn" title="Profile Mods">&#x1F441;</button>
                            <button class="action-btn duplicate-btn" title="Duplicate Profile">🞧</button>
                            <button class="action-btn delete-btn" title="Delete Profile">🞮</button>
                        </div>
                    </td>
                <td title="${profile.lastRun === 0 ? "Never Ran" : lastRunFull}">${profile.lastRun === 0 ? "NEVER" : lastRunDate}</td>
                <td>${profile.totalRuns}</td>
                `;

        // Setup action buttons
        const infoBtn = row.querySelector('.info-btn');
        const duplicateBtn = row.querySelector('.duplicate-btn');
        const deleteBtn = row.querySelector('.delete-btn');

        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            app.ui.modals.showInfoModal(profile);
        });

        duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            app.duplicateMode = profile.id;
            app.ui.modals.openNewProfileModal(profile.name + ' (Copy)', profile.id + '-copy');
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

export function reevaluateSearch(term = "") {
    term = term.toLowerCase();
    const filteredData = app.profileData.filter(profile =>
        profile.name.toLowerCase().includes(term)
    );
    renderTable(filteredData)
}

export function sortProfiles(th, overrideOrder = null) {
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

export function setup(APP) {
    app = APP;
    // Setup sorting
    document.querySelectorAll('#profilesTable th').forEach(th => {
        // if (th.dataset.column === 'lastRun') sortProfiles(th, 'desc');
        th.addEventListener('click', () => {
            sortProfiles(th)
        });
    });

    // Setup search
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