/**
 * TimeoutMap is a map that evicts values after a certain timeout
 * A callback, onTimeout, can optionally be registered which will be called upon each value's timeout
 */
export declare class TimeoutMap<K, V> extends Map<K, V> {
    onTimeout: ((k: K, v: V) => void) | undefined;
    private timeout;
    private timeouts;
    constructor(timeout: number, onTimeout?: (k: K, v: V) => void);
    setTimeout(key: K, timeout: number): void;
    setWithTimeout(key: K, value: V, timeout: number): this;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    clear(): void;
}
