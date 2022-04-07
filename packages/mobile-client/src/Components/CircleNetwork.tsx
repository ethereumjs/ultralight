import { ENR } from '@chainsafe/discv5'
import { lightblue } from '../App'

interface NetworkProps {
  peers: ENR[] | undefined
  distances: [number, string[]][]
}

export function bitLength(n: number): number {
  const bitstring = n.toString(2)
  if (bitstring === '0') {
    return 0
  }
  return bitstring.length
}
export function nextPowerOf2(n: number): number {
  return n <= 0 ? 1 : Math.pow(2, bitLength(n - 1))
}

function active(nums: number[]) {
  const numbers = nums.sort((a, b) => a - b)
  const select = 1 / 256 / 2
  let string = `0 ${(select / 2) * 452} ${select * 452} ${(select / 2) * 452} 0 `
  numbers.forEach((n, idx) => {
    const dif = n - (numbers[idx - 1] || 0)
    const first = (dif - 1) / 256 + select / 2
    string += `${first * 452} ${select * 452} ${(select / 2) * 452} 0 `
  })
  const after = (256 - numbers[numbers.length - 1]) / 256 + select / 2
  string += `${after * 452}`
  return string
}

function makeTree(peers: number, selected: number[]) {
  const leaves = 256
  const depth = Math.log2(leaves)
  const treeSize = new Array(depth + 1).fill('X')
  return (
    <>
      <svg
        fill={lightblue}
        color={lightblue}
        viewBox="-32 -32 574 574"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="256"
          transform={`rotate(0 256 256)`}
          cy="256"
          r={264}
          fill={lightblue}
          stroke="blue"
          strokeWidth={16}
          strokeDasharray="828"
        />
        <circle cx="256" cy="256" r={256} fill={lightblue} />
        {/* <circle
        cx="256"
        cy="256"
        r="128"
        fill="bisque"
        transform={`rotate(135 256 256)`}
        stroke="#0088dd"
        strokeWidth="256"
        strokeDasharray={`${402 / 2}`}
        />
      <circle cx="256" cy="256" r="240" fill="grey" /> */}
        {treeSize.map((level, idx) => {
          return (
            idx > 0 && (
              <>
                <circle
                  cx="256"
                  cy="256"
                  r={128}
                  fill={lightblue}
                  transform={`rotate(${90 + 90 / 2 ** idx} 256 256)`}
                  stroke={`#`.padEnd(7, `${idx}f0`)}
                  strokeWidth={256 - (idx - 1) * 32}
                  strokeDasharray={`${402 / 2 ** idx}`}
                />
                <circle cx="256" cy="256" r={256 - idx * 16} fill="#bee3f8" />
                {idx === treeSize.length - 1 && (
                  <>
                    {' '}
                    {/* <circle
                    cx="256"
                    cy="256"
                    r={128}
                    fill="bisque"
                    transform={`rotate(270 256 256)`}
                    stroke={lightblue}
                    opacity={`0.9`}
                    strokeWidth={256 - (idx - 1) * 32}
                    strokeDasharray={`0 ${full * 803} ${empty * 803}`}
                  /> */}
                    <>
                      <circle
                        cx="256"
                        cy="256"
                        r={72}
                        fill={lightblue}
                        transform={`rotate(270 256 256)`}
                        stroke={'magenta'}
                        strokeWidth={144}
                        strokeDasharray={active(selected)}
                      />
                      {/* <circle cx="256" cy="256" r={256 - (idx + 1) * 16 + 8} fill={lightblue} /> */}
                    </>
                  </>
                )}
              </>
            )
          )
        })}
        {/* <circle
        cx="256"
        cy="256"
        r="128"
        transform={`rotate(112 256 256)`}
        fill="bisque"
        stroke="#00aaaa"
        strokeWidth="224"
        strokeDasharray={`${402 / 4}`}
        />
        <circle cx="256" cy="256" r="208" fill="gray" />
        
        <circle
        cx="256"
        cy="256"
        r="128"
        transform={`rotate(100 256 256)`}
        fill="bisque"
        stroke="#00dd88"
        strokeWidth="160"
        strokeDasharray={`${402 / (leaves / 4)}`}
        />
        <circle cx="256" cy="256" r="176" fill="gray" />
        <circle
        cx="256"
        cy="256"
        r="128"
        transform={`rotate(95 256 256)`}
        fill="bisque"
        stroke="#22ff22"
        strokeWidth="96"
        strokeDasharray={`${402 / (leaves / 2)}`}
        />
        <circle cx="256" cy="256" r="142" fill="gray" />
      <circle
        cx="256"
        cy="256"
        r="128"
        transform={`rotate(92 256 256)`}
        fill="bisque"
        stroke="#ffff00"
        strokeWidth="32"
        strokeDasharray={`${402 / leaves} `}
        />
      <circle cx="256" cy="256" r="16" fill="gray" /> */}
        {/* <circle cx="256" cy="256" r="142" fill="gray" />
      <circle
      cx="256"
      cy="256"
      r="128"
      transform={`rotate(${135} 256 256)`}
      fill="bisque"
      stroke="black"
      strokeWidth="32"
      strokeDasharray={`${402 / leaves} ${402 / leaves}`}
      />
    <circle cx="256" cy="256" r="16" fill="gray" /> */}
        {/* <line x1="256" y1="256" x2="0" y2="256" stroke="black" /> */}
        {/* <circle
        cx="256"
        transform={`rotate(0 256 256)`}
        cy="256"
        r={128}
        // fill="grey"
        opacity={'0.5'}
        stroke="red"
        strokeWidth={288}
        strokeDasharray="650 300"
      /> */}
      </svg>
    </>
  )
}

export default function CircleNetwork(props: NetworkProps) {
  const selected = props.distances.map((e) => {
    return e[0]
  })
  return <>{props.peers && makeTree(props.peers.length, selected)}</>
}
