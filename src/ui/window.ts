import * as Neutralino from "@neutralinojs/lib";

export default function setup(app: any): void {
    const closeBtn = document.getElementById('closeBtn')!;
    Neutralino.window.setDraggableRegion(document.getElementById('windowGrip')!, { exclude: [closeBtn] });
    closeBtn.addEventListener('click', () => {
        app.exit();
    });
}
