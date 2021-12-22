"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutMap = void 0;
/**
 * TimeoutMap is a map that evicts values after a certain timeout
 * A callback, onTimeout, can optionally be registered which will be called upon each value's timeout
 */
class TimeoutMap extends Map {
    constructor(timeout, onTimeout) {
        super();
        this.timeout = timeout;
        this.onTimeout = onTimeout;
        this.timeouts = new Map();
    }
    setTimeout(key, timeout) {
        if (!this.get(key)) {
            return;
        }
        clearTimeout(this.timeouts.get(key));
        this.timeouts.set(key, setTimeout(() => {
            const value = this.get(key);
            this.delete(key);
            this.timeouts.delete(key);
            if (this.onTimeout) {
                this.onTimeout(key, value);
            }
        }, timeout));
    }
    setWithTimeout(key, value, timeout) {
        // value map set
        super.set(key, value);
        // timeout map set
        this.setTimeout(key, timeout);
        return this;
    }
    set(key, value) {
        return this.setWithTimeout(key, value, this.timeout);
    }
    delete(key) {
        const deleted = super.delete(key);
        clearTimeout(this.timeouts.get(key));
        this.timeouts.delete(key);
        return deleted;
    }
    clear() {
        super.clear();
        for (const t of this.timeouts.values()) {
            clearTimeout(t);
        }
        this.timeouts.clear();
    }
}
exports.TimeoutMap = TimeoutMap;
