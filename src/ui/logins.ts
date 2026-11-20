import { escapeHtml } from "../util/util";
import { dialog } from "./dialog";
import { generateToken, verifyToken } from "../factorioApi";
import type { StoredLogin } from "../types";

const el = {
    loginsModal: document.getElementById('loginsModal')!,
    manageLoginsBtn: document.getElementById('manageLoginsBtn')!,
    loginsList: document.getElementById('loginsList')!,
    // Manual token entry
    newLoginUsername: document.getElementById('newLoginUsername') as HTMLInputElement,
    newLoginToken: document.getElementById('newLoginToken') as HTMLInputElement,
    addLoginBtn: document.getElementById('addLoginBtn')!,
    // Password -> token generation
    loginPasswordUsername: document.getElementById('loginPasswordUsername') as HTMLInputElement,
    loginPassword: document.getElementById('loginPassword') as HTMLInputElement,
    generateLoginBtn: document.getElementById('generateLoginBtn')!,
    closeSpan: document.querySelector('#loginsModal .close-modal') as HTMLElement,
};

function setBusy(btn: HTMLButtonElement, busy: boolean, busyText: string): void {
    if (busy) {
        btn.dataset.originalText = btn.textContent || '';
        btn.textContent = busyText;
        btn.disabled = true;
    } else {
        btn.textContent = btn.dataset.originalText || btn.textContent || '';
        btn.disabled = false;
    }
}

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
            <span class="login-status"></span>
            <span class="login-actions">
                <button class="action-btn test-btn" title="Verify this login">Test</button>
                <button class="action-btn delete-btn" title="Delete Login">Delete</button>
            </span>
        `;

        row.querySelector('.test-btn')!.addEventListener('click', async () => {
            const status = row.querySelector('.login-status') as HTMLElement;
            const btn = row.querySelector('.test-btn') as HTMLButtonElement;
            status.textContent = 'Checking...';
            btn.disabled = true;
            try {
                const result = await verifyToken(login.username, login.token);
                status.textContent = result.valid ? '✓ Valid' : `✗ ${result.reason || 'Invalid'}`;
                status.title = result.valid ? 'Token verified' : (result.reason || '');
            } catch (e) {
                status.textContent = '✗ Error';
            } finally {
                btn.disabled = false;
            }
        });

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
    el.loginPasswordUsername.value = '';
    el.loginPassword.value = '';
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

    // Generate a token from username + password and save it.
    el.generateLoginBtn.addEventListener('click', async () => {
        const username = el.loginPasswordUsername.value.trim();
        const password = el.loginPassword.value;
        const btn = el.generateLoginBtn as HTMLButtonElement;

        if (!username || !password) {
            alert('Both username and password are required.');
            return;
        }

        setBusy(btn, true, 'Signing in...');
        try {
            const result = await generateToken(username, password);
            await app.logins.add(result.username, result.token);
            renderList(app);
            el.loginPasswordUsername.value = '';
            el.loginPassword.value = '';
            dialog(`<p>Signed in as <b>${escapeHtml(result.username)}</b> and saved the token.</p>`, [{text: 'OK', primary: true}], true);
        } catch (e) {
            dialog(`<p>Sign-in failed:</p><pre>${escapeHtml(e?.message || e)}</pre>`, [{text: 'OK', primary: true}], true);
        } finally {
            setBusy(btn, false, '');
        }
    });

    // Add a token manually.
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
