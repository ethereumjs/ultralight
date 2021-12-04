import tape from 'tape';
import { distance, MODULO } from '../../src/stateSubnetwork/util'
import BN from 'bn.js'

tape('distance()', (t) => {

    t.test('should calculate distance between two values', (st) => {
        st.ok(distance(new BN(10), new BN(10)).eq(new BN(0)), 'calculates correct distance')
        st.ok(distance(new BN(5), MODULO.subn(1)).eq(new BN(6)), 'calculates correct distance')
        st.ok(distance(MODULO.subn(1), new BN(6)).eq(new BN(7)), 'calculates correct distance')
        st.ok(distance(new BN(5), new BN(1)).eq(new BN(4)), 'calculates correct distance')
        st.ok(distance(new BN(1), new BN(5)).eq(new BN(4)), 'calculates correct distance')
        st.ok(distance(new BN(0), new BN(2).pow(new BN(255))).eq(new BN(2).pow(new BN(255))), 'calculates correct distance')
        st.ok(distance(new BN(0), new BN(2).pow(new BN(255)).addn(1)).eq(new BN(2).pow(new BN(255)).subn(1)), 'calculates correct distance')
        st.end()
    })
    t.end()
})