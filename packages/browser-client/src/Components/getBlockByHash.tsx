import { Button, FormControl, HStack, Input } from '@chakra-ui/react'
import React, { Dispatch, SetStateAction, useContext, useState } from 'react'
import { BlockContext, HistoryProtocolContext } from '../ContextHooks'

interface IGetBlockByNumberProps {
  setIsLoading: Dispatch<SetStateAction<boolean>>
}

export default function GetBlockByHash(props: IGetBlockByNumberProps) {
  const history = useContext(HistoryProtocolContext)
  const [blockHash, setBlockHash] = useState('')
  const { setBlock } = useContext(BlockContext)

  async function eth_getBlockByHash(blockHash: string, includeTransactions: boolean) {
    try {
      const block = await history.getBlockByHash(blockHash, includeTransactions)
      setBlock(block!)
    } catch {
      return 'Block not found'
    }
  }

  async function handleClick() {
    props.setIsLoading(true)
    await eth_getBlockByHash(blockHash, true)
    props.setIsLoading(false)
  }

  return (
    <HStack marginY={1}>
      <Button width={'40%'} onClick={handleClick}>
        Get Block by Hash
      </Button>
      <FormControl isInvalid={!blockHash.startsWith('0x')}>
        <Input
          bg="whiteAlpha.800"
          placeholder={`BlockHash`}
          type={'string'}
          onChange={(e) => setBlockHash(e.target.value)}
        />
      </FormControl>
    </HStack>
  )
}
