function setupWindowBar() {
    const closeBtn = document.getElementById('closeBtn');
    Neutralino.window.setDraggableRegion(document.getElementById('windowGrip'), {exclude: [closeBtn]});
    closeBtn.addEventListener('click', () => {
        app.exit();
    });
}