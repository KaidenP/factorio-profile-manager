import * as Neutralino from "@neutralinojs/lib";
import type { Profile } from "../types";

export function setup(app: any): void {
    const closeBtn = document.getElementById('closeBtn')!;
    const titlebarControls = document.getElementById('titlebarControls')!;
    const profileSelect = document.getElementById('titlebarProfileSelect') as HTMLSelectElement;

    Neutralino.window.setDraggableRegion(document.getElementById('windowGrip')!, {
        exclude: [titlebarControls]
    });

    closeBtn.addEventListener('click', () => {
        app.exit();
    });

    profileSelect.addEventListener('change', () => {
        app.selectedProfile = profileSelect.value;
        app.render();
    });
}

/**
 * Keep the title-bar profile selector and active-account label in sync with
 * the current app state. Called from Application.render().
 */
export function sync(app: any): void {
    const profileSelect = document.getElementById('titlebarProfileSelect') as HTMLSelectElement;
    const userEl = document.getElementById('titlebarUser')!;

    const current = app.selectedProfile;
    profileSelect.innerHTML = '';
    app.profileData.forEach((p: Profile) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === current) opt.selected = true;
        profileSelect.appendChild(opt);
    });

    const active = app.logins?.activeLogin;
    userEl.textContent = active ? active.username : 'No account';
    userEl.title = active ? `Active Factorio account: ${active.username}` : 'No Factorio account selected';
}
