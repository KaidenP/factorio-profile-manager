export default class QueueWorker {
    concurrencyLimit: number = 1;

    constructor(config: { concurrencyLimit?: number } = {}) {
        Object.assign(this, config);
    }

    private _tasks: Array<() => Promise<void>> = [];
    private _running: number = 0;

    addTask(task: () => Promise<void>): void {
        this._tasks.push(task);
    }

    private _promiseControls: { resolve: (value?: any) => any; reject: (reason?: any) => void } | null = null;

    private _nextTask(): void {
        if (this._running >= this.concurrencyLimit) return;
        const task = this._tasks.shift();
        if (!task) {
            if (this._running === 0) {
                // No more tasks, resolve the promise
                if (this._promiseControls?.resolve) this._promiseControls.resolve();
            }
            return;
        }

        this._running++;
        task().then(
            () => {
                this._running--;
                this._nextTask();
            },
            (err) => {
                this._running--;
                this._promiseControls?.reject(err);
                this._nextTask();
            }
        );
    }

    run(): Promise<void> {
        return new Promise((resolve, reject) => {
            this._promiseControls = { resolve, reject };
            for (let i = 0; i < this.concurrencyLimit; i++) {
                this._nextTask();
            }
        });
    }

    private _stopping = false;
    stop(): Promise<void> {
        if (this._stopping) return Promise.resolve();
        this._stopping = true;
        return new Promise<void>((resolve) => {
            const r2 = this._promiseControls?.reject;
            const endFn = () => {
                this._stopping = false;
                r2?.();
                resolve();
            };
            this._promiseControls = {
                resolve: () => endFn,
                reject: endFn
            };
        });
    }

    shuffle(): void {
        for (let i = this._tasks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._tasks[i], this._tasks[j]] = [this._tasks[j], this._tasks[i]];
        }
    }
}
