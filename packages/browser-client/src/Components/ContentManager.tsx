import { Button } from '@chakra-ui/react'
import { Block } from '@ethereumjs/block'
import { addRLPSerializedBlock, ethJsBlockToEthersBlockWithTxs, fromHexString } from 'portalnetwork'
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
          let last: jsonblock | undefined = blocks[0]
          for (const block of blocks) {
            await addRLPSerializedBlock(block.rlp, block.blockHash, state.provider!.historyProtocol)
            last = block
          }
          dispatch({
            type: StateChange.SETBLOCK,
            payload: await ethJsBlockToEthersBlockWithTxs(
              Block.fromRLPSerializedBlock(Buffer.from(fromHexString(last.rlp)), {
                hardforkByBlockNumber: true,
              })
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
      Upload
      <br />
      Content
    </Button>
  )
}
