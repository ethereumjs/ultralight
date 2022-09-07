import { Button, FormControl, HStack, Input } from '@chakra-ui/react'
import React, { useContext, useState } from 'react'
import { AppContext, StateChange } from '../globalReducer'

export default function GetBlockByHash() {
  const { state, dispatch } = useContext(AppContext)
  const [blockHash, setBlockhash] = useState('')
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
