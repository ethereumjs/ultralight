import { Button } from '@chakra-ui/react'
import { Block } from '@ethereumjs/block'
import {
  PortalNetwork,
  addRLPSerializedBlock,
  getHistoryNetworkContentId,
  distance,
  ProtocolId,
  fromHexString,
} from 'portalnetwork'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'
import React, { useContext, useState } from 'react'
import { BlockContext, HistoryProtocolContext, PortalContext } from '../App'

export default function ContentManager() {
  // Add list of blocks to db from json file
  // json:
  // [
  //   {
  //     hash: "0xa7b7524f..."
  //     rlp: "0x8ab3614cd62fe..."
  //   },
  //   {
  //     hash: "0x725fac22..."
  //     rlp: "0x3cd5ab36..."
  //   }
  // ]
  const [newest, setNewest] = useState('')
  const protocol = useContext(HistoryProtocolContext)
  const portal = useContext(PortalContext)
  const { setBlock } = useContext(BlockContext)
  interface jsonblock {
    hash: string
    rlp: string
  }

  const handleUpload = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const files = evt.target.files
    const reader = new FileReader()
    if (files && files.length > 0) {
      reader.onload = async function () {
        if (reader.result) {
          const arrayData = JSON.parse(reader.result as string) as jsonblock[]
          arrayData
            .sort((a, b) => {
              const diff =
                distance(BigInt('0x' + portal.discv5.enr.nodeId), BigInt(a.hash)) -
                distance(BigInt('0x' + portal!.discv5.enr.nodeId), BigInt(b.hash))
              const res = diff < 0n ? -1 : 1
              return res
            })
            .slice(0, 10)
            .forEach(async (block, idx) => {
              setNewest(block.rlp)
              addRLPSerializedBlock(block.rlp, block.hash, protocol)
            })
        }
      }
      reader.readAsText(files[0])
    }
  }

  const handleClick = () => {
    const fileInputEl = document.createElement('input')
    fileInputEl.type = 'file'
    fileInputEl.accept = 'application/json'
    fileInputEl.style.display = 'none'
    document.body.appendChild(fileInputEl)
    fileInputEl.addEventListener('input', async (e) => {
      await handleUpload(e as any)
      setBlock(
        Block.fromRLPSerializedBlock(Buffer.from(fromHexString(newest)), {
          hardforkByBlockNumber: true,
        })
      )
      document.body.removeChild(fileInputEl)
    })
    fileInputEl.click()
  }

  return (
    <Button isDisabled={!portal} width={'100%'} onClick={handleClick}>
      Load Blocks from File
    </Button>
  )
}
