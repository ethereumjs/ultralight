import * as blocks from './hashlist.json';
import * as storedAccumulator from './storedAccumulator.json'
import * as fs from 'fs'
import { EpochAccumulator, EpochAccumulatorType, fromHexString, HeaderAccumulator, HeaderAccumulatorType, toHexString, HashArray, HashArrayRequestKeys} from '../../portalnetwork/src'
import { HashArrayWithProofSSZ } from 'portalnetwork';

const hashes = Object.values(blocks).map((hash) => {return hash.hash})
const lists = Math.floor(hashes.length / 8192)

const accumulator = HeaderAccumulatorType.deserialize(fromHexString(storedAccumulator.serialized))
const proofs = accumulator.historicalEpochs.map((root) => {return toHexString(root)})
const hashArrays: string[][] = []

for (let i=0; i<lists; i++) {
    const start = i*8192
    const end = start + 8192
    const array = hashes.slice(start, end).map((v) => {return v})
    hashArrays.push(array)
}

const keys: string[] = HashArrayRequestKeys

const hashArrayContents: [string, string][] = hashArrays.map((_hashArray, idx) => {
const _array = _hashArray.map((v) => {return fromHexString(v)})
    const _key = keys[idx]
    const _proof = proofs[idx]
    const _serialized = toHexString(HashArrayWithProofSSZ.serialize({array: _array, proof: fromHexString(_proof)}))
    return [_key, _serialized]
})

const hashArraysObject: Record<string, string> = Object.fromEntries(hashArrayContents)

const store = JSON.stringify(hashArraysObject)

fs.writeFileSync('./storedHashArrays.json', store, {encoding: "utf8"})

const fromFile = fs.readFileSync('./storedHashArrays.json', {encoding: 'utf8'})

const stored = JSON.parse(fromFile)

console.log(keys[0])
console.log(typeof Object.keys(stored)[0])
console.log(([...(Object.values(stored)).values()][0] as any).slice(0,10))
// console.log((Object.values(stored)[0] as any).array)
// console.log(fromFile)