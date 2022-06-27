import { fromHexString } from '@chainsafe/ssz'
import tape from 'tape'
import {
  getHistoryNetworkContentId,
  HistoryNetworkContentKeyUnionType,
  serializedContentKeyToContentId,
} from '../../../src'

tape('utility functions', (t) => {
  const block1Hash = '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
  const block1headerContentKey = HistoryNetworkContentKeyUnionType.serialize({
    selector: 0,
    value: { chainId: 1, blockHash: fromHexString(block1Hash) },
  })
  t.equal(
    getHistoryNetworkContentId(1, 0, block1Hash),
    serializedContentKeyToContentId(block1headerContentKey),
    'produced same content id'
  )
  t.end()
})
