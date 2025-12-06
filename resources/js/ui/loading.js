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
