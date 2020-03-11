/**
 * Computes the number of zero bits of the XOR computation between two byte arrays.
 * @param a the first byte array
 * @param b the second byte array
 */
export function xorDist(a: Buffer, b: Buffer): number {
  if (a.length != b.length) {
    throw "arrays are of different lengths";
  }
  let distance = a.length * 8;
  let i = 0;
  while (i < a.length) {
    const xor = a[i] ^ b[i];
    if (xor == 0 ) {
      distance -= 8;
    } else {
      distance -= (numberOfLeadingZeros(xor) - 24);
      break;
    }
    i++;
  }
  return distance;
}

function numberOfLeadingZeros(i: number): number {
  if (i <= 0)
    return i == 0 ? 32 : 0;
  let n = 31;
  if (i >= 1 << 16) { n -= 16; i >>>= 16; }
  if (i >= 1 <<  8) { n -=  8; i >>>=  8; }
  if (i >= 1 <<  4) { n -=  4; i >>>=  4; }
  if (i >= 1 <<  2) { n -=  2; i >>>=  2; }
  return n - (i >>> 1);
}
