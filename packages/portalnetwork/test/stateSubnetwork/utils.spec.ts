import tape from 'tape'
import { distance, MODULO } from '../../src/stateSubnetwork/util'

tape('distance()', (t) => {
  t.test('should calculate distance between two values', (st) => {
    st.ok(distance(10n, 10n) === 0n, 'calculates correct distance')
    st.ok(distance(5n, MODULO - 1n) === 6n, 'calculates correct distance')
    st.ok(distance(MODULO - 1n, 6n) === 7n, 'calculates correct distance')
    st.ok(distance(5n, 1n) === 4n, 'calculates correct distance')
    st.ok(distance(1n, 5n) === 4n, 'calculates correct distance')
    st.ok(distance(0n, 2n ** 255n) === 2n ** 255n, 'calculates correct distance')
    st.ok(distance(0n, 2n ** 255n + 1n) === 2n ** 255n - 1n, 'calculates correct distance')
    st.end()
  })
  t.end()
})
