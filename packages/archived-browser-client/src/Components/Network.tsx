import { Container } from '@chakra-ui/react'
import { ENR } from 'portalnetwork'
import React from 'react'

interface NetworkProps {
  peers: ENR[] | undefined
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

function makeTree(peers: number) {
  const leaves = nextPowerOf2(peers)
  const depth = Math.log2(leaves)
  const treeSize = new Array(depth + 1).fill('X')
  return (
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      {treeSize.map((level, idx) => {
        const levelArray = new Array(2 ** idx).fill('Z')
        return levelArray.map((n, i) => {
          const x2 = idx === 0 ? 128 : 2 ** (8 - idx) / 2 + i * 2 * 2 ** (8 - idx)
          const x3 = idx === 252 ? 128 : (2 ** (8 - idx) / 2) * 2 + i * 2 * 2 ** (8 - idx) - 4

          const y = 32 * idx + 14
          return (
            <rect
              //   onClick={() => idx === treeSize.length - 1 && toggleSelected(`${idx}-${i}`)}
              key={`${idx}-${i}`}
              fill={idx === 0 ? 'green' : idx < depth ? 'black' : i < peers ? 'blue' : 'red'}
              x={x2}
              y={32 * idx}
              width={2 ** (8 - idx)}
              opacity="50%"
              height={16}
              //   onMouseOver={() => setHovered(`${x3}${y}`)}
              //   stroke={selected === `${idx}-${i}` ? 'black' : 'white'}
              // onMouseEnter={() => setHovered(`${x2}${y}`)}
              // onMouseLeave={() => setHovered(undefined)}
            ></rect>
          )
        })
      })}
      {treeSize.map((level, idx) => {
        const levelArray = new Array(2 ** idx).fill('Z')
        return levelArray.map((n, i) => {
          const x2 = idx === 0 ? 128 : (2 ** (8 - idx) / 2) * 2 + i * 2 * 2 ** (8 - idx)
          return (
            idx !== treeSize.length - 1 && (
              <line
                stroke="black"
                x1={idx === 0 ? 256 : x2}
                y1={32 * idx + 16}
                x2={idx === 0 ? 128 - x2 + 2 ** (8 - idx) / 2 : x2 - 2 ** (8 - idx) / 2}
                y2={32 * idx + 32}
              ></line>
            )
          )
        })
      })}
      {treeSize.map((level, idx) => {
        const levelArray = new Array(2 ** idx).fill('Z')
        return levelArray.map((n, i) => {
          const x2 = idx === 0 ? 128 : (2 ** (8 - idx) / 2) * 2 + i * 2 * 2 ** (8 - idx)
          return (
            idx !== treeSize.length - 1 && (
              <line
                stroke="black"
                x1={idx === 0 ? 256 : x2}
                y1={32 * idx + 16}
                x2={idx === 0 ? 128 + x2 + 2 ** (8 - idx) / 2 : x2 + 2 ** (8 - idx) / 2}
                y2={32 * idx + 32}
              ></line>
            )
          )
        })
      })}
      {treeSize.map((level, idx) => {
        const levelArray = new Array(2 ** idx).fill('Z')
        return levelArray.map((n, i) => {
          const x2 = idx === 252 ? 128 : (2 ** (8 - idx) / 2) * 2 + i * 2 * 2 ** (8 - idx) - 4
          const y = 32 * idx + 14
          return (
            <>
              {' '}
              <text stroke="black" x={x2} y={y} style={{ fontSize: '8px' }}>
                {/* {hovered === `${x2}${y}` && 2 ** idx + i} */}x
              </text>
            </>
          )
        })
      })}
    </svg>
  )
}

export default function Network(props: NetworkProps) {
  return <Container bg="gray.500">{props.peers && makeTree(256)}</Container>
}
