import tape from 'tape';
import { distance } from '../../src/stateSubnetwork/util'
import BN from 'bn.js'

tape('distance()', (t) => {

    t.test('should calculate distance between two nodes', (st) => {
        const node1 = "40e093a48c603a631104a78105028fba75f67c13ba724af357eadc7b51564312"
        const node2 = "ea111f9f9685cb93c16e3cbafe555acd30b78150aacf39a0502661a6f65d9d63"
        const dist = distance(node1, node2);
        console.log(dist.toString())
    })
    t.end()
})