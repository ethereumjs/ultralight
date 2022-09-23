import { Button, FormControl, HStack, Input } from '@chakra-ui/react'
import React, { useContext, useEffect, useState } from 'react'
import { AppContext, AppContextType, StateChange } from '../globalReducer'

export default function GetBlockByHash() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const [blockHash, setBlockhash] = useState(
    '0xb495a1d7e6663152ae92708da4843337b958146015a2802f4193a410044698c9'
  )
  async function eth_getBlockByHash(blockHash: string, includeTransactions: boolean) {
    try {
      const block = includeTransactions
        ? await state.provider!.getBlockWithTransactions(blockHash)
        : await state.provider!.getBlock(blockHash)
      dispatch({ type: StateChange.SETBLOCK, payload: block })
    } catch {
      return 'Block not found'
    }
  }

  async function handleClick() {
    dispatch({ type: StateChange.TOGGLELOADING })
    await eth_getBlockByHash(blockHash, true)
    dispatch({ type: StateChange.TOGGLELOADING })
  }

  async function getInitialBlock() {
    await eth_getBlockByHash(blockHash, true)
  }

  useEffect(() => {
    getInitialBlock()
  }, [])

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
          onChange={(e) => setBlockhash(e.target.value)}
        />
      </FormControl>
    </HStack>
  )
}
