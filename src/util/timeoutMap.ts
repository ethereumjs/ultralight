/**
 * TimeoutMap is a map that evicts values after a certain timeout
 * A callback, onTimeout, can optionally be registered which will be called upon each value's timeout
 */
export class TimeoutMap<K, V> extends Map<K, V> {
  public onTimeout: ((k: K, v: V) => void) | undefined;
  private timeout: number;
  private timeouts: Map<K, NodeJS.Timeout>;

  constructor(timeout: number, onTimeout?: (k: K, v: V) => void) {
    super();
    this.timeout = timeout;
    this.onTimeout = onTimeout;
    this.timeouts = new Map();
  }

  setTimeout(key: K, timeout: number): void {
    if (!this.get(key)) {
      return;
    }
    clearTimeout(this.timeouts.get(key) as NodeJS.Timeout);
    this.timeouts.set(
      key,
      setTimeout(() => {
        const value = this.get(key);
        this.delete(key);
        this.timeouts.delete(key);

        if (this.onTimeout) {
          this.onTimeout(key, value as V);
        }
      }, timeout)
    );
  }

  setWithTimeout(key: K, value: V, timeout: number): this {
    // value map set
    super.set(key, value);
    // timeout map set
    this.setTimeout(key, timeout);
    return this;
  }

  set(key: K, value: V): this {
    return this.setWithTimeout(key, value, this.timeout);
  }

  delete(key: K): boolean {
    const deleted = super.delete(key);
    clearTimeout(this.timeouts.get(key) as NodeJS.Timeout);
    this.timeouts.delete(key);
    return deleted;
  }

  clear(): void {
    super.clear();
    for (const t of this.timeouts.values()) {
      clearTimeout(t);
    }
    this.timeouts.clear();
  }
}
