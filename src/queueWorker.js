export default class QueueWorker {
    concurrencyLimit = 1;

    /**
     * @param {object} config
     * @param {number} config.concurrencyLimit
     */
    constructor(config = {}) {
        Object.keys(config).forEach(key => this[key] = config[key]);
    }

    _tasks = [];
    _running = 0;

    /**
     * Adds a task to the queue.
     * @param {()=>Promise<void>} task
     */
    addTask(task) {
        this._tasks.push(task);
    }

    _promiseControls = null;
    _nextTask() {
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
        task().finally(() => {
            this._running--
            this._nextTask()
        });
    }

    run() {
        return new Promise((resolve, reject) => {
            this._promiseControls = {resolve, reject};
            for (let i=0; i < this.concurrencyLimit; i++) {
                this._nextTask();
            }
        })
    }

    _stopping = false;
    stop() {
        if (this._stopping) return;
        this._stopping = true;
        return new Promise((resolve) => {
            let r2 = this._promiseControls?.reject
            const endFn = () => {
                this._stopping = false;
                r2();
                resolve();
            }
            this._promiseControls = {
                resolve: () => endFn, reject: endFn
            }
        })
    }

    shuffle() {
        for (let i = this._tasks.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [this._tasks[i], this._tasks[j]] = [this._tasks[j], this._tasks[i]];
        }
    }
}