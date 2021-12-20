import { fromHexString, toHexString } from '@chainsafe/ssz'
import tape from 'tape'
import { HistoryNetworkContentKeyUnionType } from "../../src/historySubnetwork"
import SHA256 from '@chainsafe/as-sha256'

tape('History Subnetwork contentKey serialization/deserialization', async t => {
    let chainId = 15
    let blockHash = "0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d"
    let encodedKey = HistoryNetworkContentKeyUnionType.serialize({ selector: 1, value: { chainId: chainId, blockHash: fromHexString(blockHash) } })
    t.equals(toHexString(encodedKey), "0x010f00d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d", 'blockheader content key equals expected output')
    t.equals(toHexString(SHA256.digest(encodedKey)), "0xf883705bc68dcd46f9064e8c18dc1c1ae90ba88149b1177bdf1986272779675b", 'block header content ID matches')
    chainId = 20
    blockHash = "0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d"
    encodedKey = HistoryNetworkContentKeyUnionType.serialize({ selector: 2, value: { chainId, blockHash: fromHexString(blockHash) } })
    t.equals(toHexString(encodedKey), "0x021400d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d", 'blockbody content key equals expected output')
    t.equals(toHexString(SHA256.digest(encodedKey)), "0xfccf5551a4b704080d4a7c89fc87b3e88a232683c88c2100240e05b6cf2fe441", 'block body content ID matches')
    chainId = 4
    blockHash = "0xd1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d"
    encodedKey = HistoryNetworkContentKeyUnionType.serialize({ selector: 3, value: { chainId, blockHash: fromHexString(blockHash) } })
    t.equals(toHexString(encodedKey), "0x030400d1c390624d3bd4e409a61a858e5dcc5517729a9170d014a6c96530d64dd8621d", 'receipt content key equals expected output')
    t.equals(toHexString(SHA256.digest(encodedKey)), "0x42a3a15338bbd23dd373f831eddbb48d781120c2ea052cc06ff839875e5682e9", 'receipt content ID matches')
    t.end()
})  
