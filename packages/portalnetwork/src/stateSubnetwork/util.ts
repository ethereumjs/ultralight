export const MODULO = 2n ** 256n
const MID = 2n ** 255n

/** 
 * Calculates the distance between two ids using the distance function defined here 
 * https://github.com/ethereum/portal-network-specs/blob/master/state-network.md#distance-function
 */
export const distance = (id1: bigint, id2: bigint): bigint => {
    if (id1 >= MODULO || id2 >= MODULO) {
        throw new Error('numeric representation of node id cannot be greater than 2^256')
    }
    let diff: bigint
    id1 > id2 ? diff = id1 - id2 : diff = id2 - id1
    diff > MID ? diff = MODULO - diff : diff
    return diff
}