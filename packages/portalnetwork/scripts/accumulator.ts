import { EpochAccumulator, fromHexString, HeaderAccumulator, HeaderAccumulatorType, HeaderRecord, HeaderRecordType, HeaderAccumulator, toHexString } from "../src";
import * as blocks from './blocksData25000.json'
import * as fs from 'fs'

type blockDatum = {
    "number": number
    "hash": string,
    "raw": string,
    "rawHeader": string
    "totalDifficulty": string
}



const records = Object.values(blocks).map((block: blockDatum) => {
    const headerRecord: HeaderRecordType = {blockHash: fromHexString(block.hash), totalDifficulty: BigInt(block.totalDifficulty)}
    return headerRecord
})
console.log('records', records.length)
const epochs = Math.floor(records.length / 8192)
console.log('epochs', epochs)
const historicalEpochs = []
const currentEpoch = records.slice((epochs) * 8192)
console.log('currentEpoch',currentEpoch.length)
for (let i=0; i<epochs; i++) {
    const start = i * 8192
    const end = start + 8192
    const historicalEpoch = EpochAccumulator.hashTreeRoot(records.slice(start, end))
    console.log('historicalEpoch: ', i, toHexString(historicalEpoch).slice(0,10))
    historicalEpochs.push(historicalEpoch)
}
console.log('historical epochs',historicalEpochs.length)
const storedAccumulator: HeaderAccumulator = {
        historicalEpochs: historicalEpochs,
        currentEpoch: currentEpoch
    }
const accumulator = new HeaderAccumulator({
    initFromGenesis: false,
    storedAccumulator: storedAccumulator
})
const headerAccumulator = HeaderAccumulatorType.serialize(accumulator)
const hashTreeRoot = HeaderAccumulatorType.hashTreeRoot(accumulator)

const accumulatorJSON = {
    hashTreeRoot: toHexString(hashTreeRoot),
    serialized: toHexString(headerAccumulator),
}

console.log(JSON.stringify(accumulatorJSON))

fs.writeFileSync('./storedAccumulator.json', JSON.stringify(accumulatorJSON), {encoding: "utf8"})


