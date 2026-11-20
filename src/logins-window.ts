import * as Neutralino from "@neutralinojs/lib";
import LoginManager from "./logins";
import { escapeHtml } from "./util/util";
import { dialog } from "./ui/dialog";
import { generateToken, verifyToken } from "./factorioApi";
import type { StoredLogin } from "./types";

window.Neutralino = Neutralino;
Neutralino.init();

const logins = new LoginManager();

const el = {
    closeBtn: document.getElementById('loginsCloseBtn')!,
    header: document.getElementById('loginsWindowHeader')!,
    list: document.getElementById('loginsList')!,
    pwUsername: document.getElementById('loginPasswordUsername') as HTMLInputElement,
    pwPassword: document.getElementById('loginPassword') as HTMLInputElement,
    generateBtn: document.getElementById('generateLoginBtn') as HTMLButtonElement,
    manualUsername: document.getElementById('newLoginUsername') as HTMLInputElement,
    manualToken: document.getElementById('newLoginToken') as HTMLInputElement,
    addBtn: document.getElementById('addLoginBtn') as HTMLButtonElement,
};

function renderList(): void {
    el.list.innerHTML = '';

    if (logins.logins.length === 0) {
        el.list.innerHTML = '<p class="empty-text">No saved logins yet.</p>';
        return;
    }

    logins.logins.forEach((login: StoredLogin) => {
        const row = document.createElement('div');
        row.className = 'login-row';
        row.innerHTML = `
            <button class="action-btn default-btn${login.selected ? ' active' : ''}" title="Set as active account">${login.selected ? '★' : '☆'}</button>
            <span class="login-username">${escapeHtml(login.username)}</span>
            <span class="login-status"></span>
            <span class="login-actions">
                <button class="action-btn test-btn" title="Verify this login">Test</button>
                <button class="action-btn delete-btn" title="Delete Login">Delete</button>
            </span>
        `;

        row.querySelector('.default-btn')!.addEventListener('click', async () => {
            await logins.setDefault(login.id);
            renderList();
        });

        row.querySelector('.test-btn')!.addEventListener('click', async () => {
            const status = row.querySelector('.login-status') as HTMLElement;
            const btn = row.querySelector('.test-btn') as HTMLButtonElement;
            status.textContent = 'Checking...';
            btn.disabled = true;
            try {
                const r = await verifyToken(login.username, login.token);
                status.textContent = r.valid ? '✓ Valid' : `✗ ${r.reason || 'Invalid'}`;
            } catch (e) {
                status.textContent = '✗ Error';
            } finally {
                btn.disabled = false;
            }
        });

        row.querySelector('.delete-btn')!.addEventListener('click', async () => {
            await logins.remove(login.id);
            renderList();
        });

        el.list.appendChild(row);
    });
}

function setBusy(btn: HTMLButtonElement, busy: boolean, text: string): void {
    if (busy) {
        btn.dataset.orig = btn.textContent || '';
        btn.textContent = text;
        btn.disabled = true;
    } else {
        btn.textContent = btn.dataset.orig || btn.textContent || '';
        btn.disabled = false;
    }
}

(async () => {
    await logins.load();
    renderList();

    Neutralino.window.setDraggableRegion(el.header, { exclude: [el.closeBtn] });

    el.closeBtn.addEventListener('click', () => Neutralino.app.exit());

    el.generateBtn.addEventListener('click', async () => {
        const u = el.pwUsername.value.trim();
        const p = el.pwPassword.value;
        if (!u || !p) {
            alert('Both username and password are required.');
            return;
        }
        setBusy(el.generateBtn, true, 'Signing in...');
        try {
            const r = await generateToken(u, p);
            await logins.add(r.username, r.token);
            renderList();
            el.pwUsername.value = '';
            el.pwPassword.value = '';
            dialog(`<p>Signed in as <b>${escapeHtml(r.username)}</b> and saved the token.</p>`, [{text: 'OK', primary: true}], true);
        } catch (e) {
            dialog(`<p>Sign-in failed:</p><pre>${escapeHtml(e?.message || e)}</pre>`, [{text: 'OK', primary: true}], true);
        } finally {
            setBusy(el.generateBtn, false, '');
        }
    });

    el.addBtn.addEventListener('click', async () => {
        const u = el.manualUsername.value.trim();
        const t = el.manualToken.value.trim();
        if (!u || !t) {
            alert('Both username and token are required.');
            return;
        }
        await logins.add(u, t);
        renderList();
        el.manualUsername.value = '';
        el.manualToken.value = '';
    });
})();
