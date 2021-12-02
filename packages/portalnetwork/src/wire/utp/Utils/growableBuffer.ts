import { nextPowerOf2 } from "./math";

export interface IOptionOptions<T> {
  has: boolean;
  value?: T;
}

export class Option<T> {
  has: boolean;
  value?: T;

  constructor(options: IOptionOptions<T>) {
    this.has = options.has;
    this.value = options.value;
  }

  get(): T {
    return this.value as T;
  }

  unsafeGet(): T {
    return this.value as T;
  }

  isSome(): boolean {
    return this.has;
  }

  isNone(): boolean {
    return !this.has;
  }

  either(otherwise: T): T {
    return this.has && this.value ? this.value : otherwise;
  }
}

export function none<T>(kind?: TypedPropertyDescriptor<T>): Option<T> {
  return new Option({ has: false });
}

export function some<T>(value: T): Option<T> {
  return new Option<T>({ has: true, value: value });
}

export interface IGCBOptions<A> {
  items?: Option<A>[];
  mask?: number;
}
export class GrowableCircularBuffer<A> {
  items: Option<A>[];
  mask: number;
  constructor(options?: IGCBOptions<A>) {
    this.items = options?.items || new Array<Option<A>>();
    this.mask = options?.mask || 0;
  }

  get(i: number): Option<A> {
    return this.items[i & this.mask];
  }

  putImpl(i: number, elem: Option<A>): void {
    this.items[i & this.mask] = elem;
  }

  put(i: number, elem: A): void {
    this.putImpl(i, some(elem));
  }

  delete(i: number): void {
    this.putImpl(i, none());
  }

  hasKey(i: number): boolean {
    return this.get(i).isSome();
  }

  exists(i: number, check: { (x: A): boolean }): boolean {
    let maybeElem = this.get(i);
    if (maybeElem.isSome()) {
      let elem = maybeElem.unsafeGet();
      return check(elem);
    } else {
      return false;
    }
  }

  contents(i: number): A {
    return this.items[i & this.mask].get();
  }

  len(): number {
    return this.mask + 1;
  }

  //   # Increase size until is next power of 2 which consists given index
  getNextSize(currentSize: number, index: number): number {
    var newSize = currentSize;
    while (true) {
      newSize = newSize * 2;
      if (index < newSize) {
        break;
      }
    }
    return newSize;
  }

  // # Item contains the element we want to make space for
  // # index is the index in the list.
  ensureSize(item: number, index: number) {
    if (index > this.mask) {
      let currentSize = this.mask + 1;
      let newSize = this.getNextSize(currentSize, index);
      let newMask = newSize - 1;
      var newSeq = new Array<Option<A>>(newSize);
      var i = 0;
      while (i <= this.mask) {
        let idx = item - index + i;
        newSeq[idx & newMask] = this.get(idx);
        i++;
      }
      this.items = newSeq;
      this.mask = newMask;
    }
  }

  [Symbol.iterator]() {
    let i = 0;
    return {
      next: () => ({
        done: i >= this.len(),
        value: this.items[i++],
      }),
    };
  }
}

export function init_GCB<A>(size: number = 16): GrowableCircularBuffer<A> {
  let powOfTwoSize = nextPowerOf2(size);
  let gcb: GrowableCircularBuffer<A> = new GrowableCircularBuffer({
    items: new Array<Option<A>>(size),
    mask: powOfTwoSize - 1,
  });
  return gcb;
}
