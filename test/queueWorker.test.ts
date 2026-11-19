import { describe, it, expect } from 'vitest';
import QueueWorker from '../src/queueWorker';

describe('QueueWorker', () => {
    it('runs every queued task to completion', async () => {
        const qw = new QueueWorker({ concurrencyLimit: 2 });
        const ran: number[] = [];

        qw.addTask(async () => { ran.push(1); });
        qw.addTask(async () => { ran.push(2); });
        qw.addTask(async () => { ran.push(3); });

        await qw.run();

        expect(ran.sort()).toEqual([1, 2, 3]);
    });

    it('does not exceed the concurrency limit', async () => {
        const qw = new QueueWorker({ concurrencyLimit: 1 });
        let running = 0;
        let maxRunning = 0;

        const task = async () => {
            running++;
            maxRunning = Math.max(maxRunning, running);
            await new Promise(resolve => setTimeout(resolve, 10));
            running--;
        };

        for (let i = 0; i < 5; i++) qw.addTask(task);
        await qw.run();

        expect(maxRunning).toBe(1);
    });

    it('propagates a rejection from a task', async () => {
        const qw = new QueueWorker({ concurrencyLimit: 1 });
        qw.addTask(async () => { throw new Error('boom'); });
        await expect(qw.run()).rejects.toThrow('boom');
    });
});
