import { fromHexString, toHexString } from '@chainsafe/ssz'
import tape from 'tape'
import { getContentId, HistoryNetworkContentKeyUnionType } from "../../src/historySubnetwork"
import SHA256 from '@chainsafe/as-sha256'
import { HistoryNetworkContentTypes } from '../../src/historySubnetwork/types'

tape('History Subnetwork contentKey serialization/deserialization', async t => {
    let chainId = 15
    let blockHash = "0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d"
    let encodedKey = HistoryNetworkContentKeyUnionType.serialize({ selector: HistoryNetworkContentTypes.BlockHeader, value: { chainId: chainId, blockHash: fromHexString(blockHash) } })
    let contentId = getContentId(chainId, blockHash, HistoryNetworkContentTypes.BlockHeader)
    t.equals(toHexString(encodedKey), "0x000f00d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d", 'blockheader content key equals expected output')
    t.equals(contentId, "0x2137f185b713a60dd1190e650d01227b4f94ecddc9c95478e2c591c40557da99", 'block header content ID matches')
    chainId = 20
    blockHash = "0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d"
    encodedKey = HistoryNetworkContentKeyUnionType.serialize({ selector: HistoryNetworkContentTypes.BlockBody, value: { chainId, blockHash: fromHexString(blockHash) } })
    contentId = getContentId(chainId, blockHash, HistoryNetworkContentTypes.BlockBody)
    t.equals(toHexString(encodedKey), "0x011400d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d", 'blockbody content key equals expected output')
    t.equals(contentId, "0x1c6046475f0772132774ab549173ca8487bea031ce539cad8e990c08df5802ca", 'block body content ID matches')
    chainId = 4
    blockHash = "0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d"
    encodedKey = HistoryNetworkContentKeyUnionType.serialize({ selector: HistoryNetworkContentTypes.Receipt, value: { chainId, blockHash: fromHexString(blockHash) } })
    contentId = getContentId(chainId, blockHash, HistoryNetworkContentTypes.Receipt)
    t.equals(toHexString(encodedKey), "0x020400d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d", 'receipt content key equals expected output')
    t.equals(contentId, "0xaa39e1423e92f5a667ace5b79c2c98adbfd79c055d891d0b9c49c40f816563b2", 'receipt content ID matches')
    t.end()
})  
