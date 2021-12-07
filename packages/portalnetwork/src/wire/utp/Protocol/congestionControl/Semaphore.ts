import { InterruptedException } from "../../Utils/exceptions";

export interface SemaphoreInterface {
    acquire(): Promise<[number, SemaphoreInterface.Releaser]>;

    runExclusive<T>(callback: SemaphoreInterface.Worker<T>): Promise<T>;

    waitForUnlock(): Promise<void>;

    isLocked(): boolean;

    // /** @deprecated Deprecated in 0.3.0, will be removed in 0.4.0. Use runExclusive instead. */
    release(): void;

    cancel(): void;
}

export namespace SemaphoreInterface {
    export interface Releaser {
        (): void;
    }

    export interface Worker<T> {
        (value: number): Promise<T> | T;
    }
}

interface QueueEntry {
    resolve: (ticket: [number, SemaphoreInterface.Releaser]) => void;
    reject: (err: Error) => void;
}

interface WaitEntry {
    resolve: () => void;
}

export const E_CANCELED = new Error('request for lock canceled');

class Semaphore implements SemaphoreInterface {
    constructor(private _maxConcurrency: number, private _cancelError: Error = E_CANCELED) {
        if (_maxConcurrency <= 0) {
            throw new Error('semaphore must be initialized to a positive value');
        }

        this._value = _maxConcurrency;
    }

    acquire(): Promise<[number, SemaphoreInterface.Releaser]> {
        const locked = this.isLocked();
        const ticketPromise = new Promise<[number, SemaphoreInterface.Releaser]>((resolve, reject) =>
            this._queue.push({ resolve, reject })
        );

        if (!locked) this._dispatch();

        return ticketPromise;
    }

    async runExclusive<T>(callback: SemaphoreInterface.Worker<T>): Promise<T> {
        const [value, release] = await this.acquire();

        try {
            return await callback(value);
        } finally {
            release();
        }
    }

    async waitForUnlock(): Promise<void> {
        if (!this.isLocked()) {
            return Promise.resolve();
        }

        const waitPromise = new Promise<void>((resolve) => this._waiters.push({ resolve }));

        return waitPromise;
    }

    isLocked(): boolean {
        return this._value <= 0;
    }

    release(): void {
        if (this._maxConcurrency > 1) {
            throw new InterruptedException()
        }

        if (this._currentReleaser) {
            const releaser = this._currentReleaser;
            this._currentReleaser = undefined;

            releaser();
        }
    }

    cancel(): void {
        this._queue.forEach((ticket) => ticket.reject(this._cancelError));
        this._queue = [];
    }

    private _dispatch(): void {
        const nextTicket = this._queue.shift();

        if (!nextTicket) return;

        let released = false;
        this._currentReleaser = () => {
            if (released) return;

            released = true;
            this._value++;
            this._resolveWaiters();

            this._dispatch();
        };

        nextTicket.resolve([this._value--, this._currentReleaser]);
    }

    private _resolveWaiters() {
        this._waiters.forEach((waiter) => waiter.resolve());
        this._waiters = [];
    }

    private _queue: Array<QueueEntry> = [];
    private _waiters: Array<WaitEntry> = [];
    private _currentReleaser: SemaphoreInterface.Releaser | undefined;
    private _value: number;
}

export default Semaphore;

