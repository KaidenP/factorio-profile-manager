import * as Neutralino from "@neutralinojs/lib"

export default function setup(app) {
    let closeBtn = document.getElementById('closeBtn');
    Neutralino.window.setDraggableRegion(document.getElementById('windowGrip'), {exclude: [closeBtn]});
    closeBtn.addEventListener('click', () => {
        app.exit();
    });
}