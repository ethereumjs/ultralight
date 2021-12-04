import _BN from 'bn.js';
const BN = _BN

export const MODULO = new BN(2).pow(new BN(256))
const MID = new BN(2).pow(new BN(255))

/** 
 * Calculates the distance between two ids using the distance function defined here 
 * https://github.com/ethereum/portal-network-specs/blob/master/state-network.md#distance-function
 */
export const distance = (id1: _BN, id2: _BN): _BN => {
    if (id1.gte(MODULO) || id2.gte(MODULO)) {
        throw new Error('numeric representation of node id cannot be greater than 2^256')
    }
    let diff: _BN
    id1.gt(id2) ? diff = id1.sub(id2) : diff = id2.sub(id1)
    diff.gt(MID) ? diff = MODULO.sub(diff) : diff
    return diff
}