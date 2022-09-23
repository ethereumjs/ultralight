import { Button } from '@chakra-ui/react'
import { Block } from '@ethereumjs/block'
import { addRLPSerializedBlock, fromHexString } from 'portalnetwork'
import React, { useContext } from 'react'
import { AppContext, AppContextType, StateChange } from '../globalReducer'

export default function ContentManager() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)

  interface jsonblock {
    blockHash: string
    rlp: string
    number?: number
  }

  const handleUpload = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const files = evt.target.files
    const reader = new FileReader()
    if (files && files.length > 0) {
      reader.onload = async function () {
        if (reader.result) {
          const blocks = JSON.parse(reader.result as string) as jsonblock[]
          for (const block of blocks) {
            await addRLPSerializedBlock(
              block.rlp,
              block.blockHash,
              state.provider?.historyProtocol!
            )
          }
          dispatch({
            type: StateChange.SETBLOCK,
            payload: Block.fromRLPSerializedBlock(
              Buffer.from(fromHexString(blocks[blocks.length - 1].rlp)),
              {
                hardforkByBlockNumber: true,
              }
            ),
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
      document.body.removeChild(fileInputEl)
    })
    fileInputEl.click()
  }

  return (
    <Button wordBreak={'break-word'} width={'100%'} onClick={handleClick}>
      Upload Content
    </Button>
  )
}
