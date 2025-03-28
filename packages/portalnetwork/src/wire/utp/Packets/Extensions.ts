export class UtpHeaderExtension {
  type: number
  len: number
  bitmask: Uint8Array

  constructor(type: number, bitmask: Uint8Array) {
    this.type = type
    this.bitmask = bitmask
    this.len = this.bitmask.length
  }
}

/**
 * Constructor for Selective Ack Packet Header Extensions
 * The 0 passed to `super()` indicates the extension type of Selective Ack (the only currently defined extension type for uTP packet headers)
 * @param bitmask - A `Uint8Array` corresponding to the packet numbers missing in the uTP stream
 * @returns `SelectiveAckHeaderExtension`
 */
export class SelectiveAckHeaderExtension extends UtpHeaderExtension {
  constructor(bitmask: Uint8Array) {
    super(0, bitmask)
    this.bitmask = bitmask
  }
  public static create = (bitmask: Uint8Array) => {
    if (bitmask.length !== 4) {
      throw new Error('Bitmask length must be exactly 4 bytes. length:' + bitmask.length)
    }
    return new SelectiveAckHeaderExtension(bitmask)
  }
}
