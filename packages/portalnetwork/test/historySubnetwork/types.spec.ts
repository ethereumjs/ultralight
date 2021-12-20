import { fromHexString, toHexString } from '@chainsafe/ssz'
import tape from 'tape'
import { HistoryNetworkContentKeyUnionType } from "../../src/historySubnetwork"
import SHA256 from '@chainsafe/as-sha256'

tape('History Subnetwork contentKey serialization/deserialization', async t => {
    let chainId = 15
    let blockHash = "0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d"
    let encodedKey = HistoryNetworkContentKeyUnionType.serialize({ selector: 0, value: { chainId: chainId, blockHash: fromHexString(blockHash) } })
    t.equals(toHexString(encodedKey), "0x000f00d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d", 'blockheader content key equals expected output')
    t.equals(toHexString(SHA256.digest(encodedKey)), "0x2137f185b713a60dd1190e650d01227b4f94ecddc9c95478e2c591c40557da99", 'block header content ID matches')
    chainId = 20
    blockHash = "0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d"
    encodedKey = HistoryNetworkContentKeyUnionType.serialize({ selector: 1, value: { chainId, blockHash: fromHexString(blockHash) } })
    t.equals(toHexString(encodedKey), "0x011400d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d", 'blockbody content key equals expected output')
    t.equals(toHexString(SHA256.digest(encodedKey)), "0x1c6046475f0772132774ab549173ca8487bea031ce539cad8e990c08df5802ca", 'block body content ID matches')
    chainId = 4
    blockHash = "0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d"
    encodedKey = HistoryNetworkContentKeyUnionType.serialize({ selector: 2, value: { chainId, blockHash: fromHexString(blockHash) } })
    t.equals(toHexString(encodedKey), "0x020400d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d", 'receipt content key equals expected output')
    t.equals(toHexString(SHA256.digest(encodedKey)), "0xaa39e1423e92f5a667ace5b79c2c98adbfd79c055d891d0b9c49c40f816563b2", 'receipt content ID matches')
    t.end()
})  
