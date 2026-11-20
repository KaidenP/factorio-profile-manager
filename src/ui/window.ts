import * as Neutralino from "@neutralinojs/lib";
import { escapeHtml } from "../util/util";
import type { StoredLogin } from "../types";

function closeAccountMenu(): void {
    const d = document.getElementById('accountDropdown');
    if (d) d.style.display = 'none';
}

/** Open the Manage Logins window (a separate Neutralino window). */
export function openManageLogins(): void {
    Neutralino.window.create('/logins.html', {
        title: 'Manage Logins',
        width: 520,
        height: 720,
        resizable: false,
        exitProcessOnClose: true,
    });
}

export function setup(app: any): void {
    const closeBtn = document.getElementById('closeBtn')!;
    const titlebarControls = document.getElementById('titlebarControls')!;
    const accountMenuBtn = document.getElementById('accountMenuBtn')!;
    const accountDropdown = document.getElementById('accountDropdown')!;
    const accountManageBtn = document.getElementById('accountManageBtn')!;

    Neutralino.window.setDraggableRegion(document.getElementById('windowGrip')!, {
        exclude: [titlebarControls]
    });

    closeBtn.addEventListener('click', () => {
        app.exit();
    });

    accountMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        accountDropdown.style.display = accountDropdown.style.display === 'none' ? 'block' : 'none';
    });

    accountManageBtn.addEventListener('click', () => {
        closeAccountMenu();
        openManageLogins();
    });

    // Close the dropdown when clicking anywhere outside of it.
    document.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('#accountMenu')) {
            closeAccountMenu();
        }
    });
}

/**
 * Keep the title-bar account menu and username label in sync with the
 * current app state. Called from Application.render().
 */
export function sync(app: any): void {
    const userEl = document.getElementById('titlebarUser')!;
    const loginListEl = document.getElementById('accountLoginList')!;

    const active = app.logins?.activeLogin;
    userEl.textContent = active ? active.username : 'No account';
    userEl.title = active ? `Active Factorio account: ${active.username}` : 'No Factorio account selected';

    const logins = app.logins?.logins ?? [];
    loginListEl.innerHTML = '';

    if (logins.length === 0) {
        loginListEl.innerHTML = '<div class="account-option muted">No saved accounts</div>';
        return;
    }

    logins.forEach((l: StoredLogin) => {
        const opt = document.createElement('div');
        opt.className = 'account-option' + (l.selected ? ' active' : '');
        opt.innerHTML = `
            <span class="check">${l.selected ? '✓' : ''}</span>
            <span>${escapeHtml(l.username)}</span>
        `;
        opt.addEventListener('click', async () => {
            await app.logins.setDefault(l.id);
            closeAccountMenu();
            sync(app);
        });
        loginListEl.appendChild(opt);
    });
}
