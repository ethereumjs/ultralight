export class UtpHeaderExtension {
    type: number;
    len: number;
    bitmask: Uint8Array;
  
    constructor(type: number, bitmask: Uint8Array) {
      this.type = type;
      this.bitmask = bitmask;
      this.len = this.bitmask.length
    }
  }
  
  export class SelectiveAckHeaderExtension extends UtpHeaderExtension {
     constructor(bitmask: Uint8Array) {
      super(1, bitmask)
      this.bitmask = bitmask
    }
  
    isBitMarked(i: number, j: number): boolean {
      return i === j
    }
  
    public static BITMAP = [ 1, 2, 4, 8, 16, 32, 64, 128];
  }
  