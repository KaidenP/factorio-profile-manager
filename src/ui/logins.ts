import { escapeHtml } from "../util/util";
import type { StoredLogin } from "../types";

const el = {
    loginsModal: document.getElementById('loginsModal')!,
    manageLoginsBtn: document.getElementById('manageLoginsBtn')!,
    loginsList: document.getElementById('loginsList')!,
    newLoginUsername: document.getElementById('newLoginUsername') as HTMLInputElement,
    newLoginToken: document.getElementById('newLoginToken') as HTMLInputElement,
    addLoginBtn: document.getElementById('addLoginBtn')!,
    closeSpan: document.querySelector('#loginsModal .close-modal') as HTMLElement,
};

export function renderList(app: any): void {
    const logins = app.logins.logins as StoredLogin[];
    el.loginsList.innerHTML = '';

    if (logins.length === 0) {
        el.loginsList.innerHTML = '<p class="empty-text">No saved logins yet.</p>';
        return;
    }

    logins.forEach(login => {
        const row = document.createElement('div');
        row.className = 'login-row';
        row.innerHTML = `
            <span class="login-username">${escapeHtml(login.username)}</span>
            <button class="action-btn delete-btn" title="Delete Login">Delete</button>
        `;
        row.querySelector('.delete-btn')!.addEventListener('click', async () => {
            await app.logins.remove(login.id);
            renderList(app);
        });
        el.loginsList.appendChild(row);
    });
}

export function openManageModal(app: any): void {
    renderList(app);
    el.newLoginUsername.value = '';
    el.newLoginToken.value = '';
    el.loginsModal.style.display = 'flex';
    el.newLoginUsername.focus();
}

export function init(app: any): void {
    el.manageLoginsBtn.addEventListener('click', () => openManageModal(app));

    el.closeSpan.addEventListener('click', () => {
        el.loginsModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === el.loginsModal) el.loginsModal.style.display = 'none';
    });

    el.addLoginBtn.addEventListener('click', async () => {
        const username = el.newLoginUsername.value.trim();
        const token = el.newLoginToken.value.trim();

        if (!username || !token) {
            alert('Both username and token are required.');
            return;
        }

        await app.logins.add(username, token);
        renderList(app);
        el.newLoginUsername.value = '';
        el.newLoginToken.value = '';
    });
}
