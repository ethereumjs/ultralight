import _BN from 'bn.js';
const BN = _BN

const MODULO = new BN(2).pow(new BN(256))
const MID = new BN(2).pow(new BN(255))

/** 
 * Calculates the distance between two ids using the distance function defined here 
 * https://github.com/ethereum/portal-network-specs/blob/master/state-network.md#distance-function
 */
export const distance = (id1: string, id2: string): _BN => {
    const num1 = new BN(id1);
    const num2 = new BN(id2);

    let diff
    num1.gt(num2) ? diff = num1.sub(num2) : diff = num2.sub(num1)
    diff.gt(MID) ? diff = MODULO.sub(diff) : diff
    return diff
}