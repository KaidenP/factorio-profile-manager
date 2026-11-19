class LoadingUI {
    modal: HTMLElement;
    bar: HTMLElement;
    text: HTMLElement;
    status: HTMLElement;

    constructor() {
        this.modal = document.getElementById('loadingModal')!;
        this.bar = document.getElementById('progressBar')!;
        this.text = document.getElementById('loadingText')!;
        this.status = document.getElementById('loadingStatus')!;
    }

    show(title = "Loading...", mode = "indeterminate"): void {
        this.modal.style.display = 'flex';
        this.text.innerHTML = title;
        this.setMode(mode);
    }

    hide(): void {
        this.modal.style.display = 'none';
    }

    setMode(mode: string): void { // 'determinate' or 'indeterminate'
        if (mode === 'indeterminate') {
            this.bar.classList.add('indeterminate');
            this.bar.style.width = '100%';
        } else {
            this.bar.classList.remove('indeterminate');
            this.bar.style.width = '0%';
        }
    }

    setProgress(percent: number, statusText?: string): void {
        if (this.bar.classList.contains('indeterminate')) {
            this.setMode('determinate');
        }
        this.bar.style.width = `${percent}%`;
        if (statusText) this.status.innerHTML = statusText;
    }
}

export default new LoadingUI();
