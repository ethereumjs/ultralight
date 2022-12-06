import { SearchIcon } from '@chakra-ui/icons'
import { Button, FormControl, HStack, IconButton, Input } from '@chakra-ui/react'
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
      dispatch({ type: StateChange.TOGGLELOADING })
    } catch {
      dispatch({ type: StateChange.TOGGLELOADING })
      return 'Block not found'
    }
  }

  async function handleClick() {
    dispatch({ type: StateChange.TOGGLELOADING })
    await eth_getBlockByHash(blockHash, true)
  }

  useEffect(() => {}, [])

  return (
    <HStack marginY={1}>
      <FormControl isInvalid={!blockHash.startsWith('0x')}>
        <Input
          size="xs"
          bg="whiteAlpha.800"
          placeholder={`BlockHash`}
          type={'string'}
          onChange={(e) => setBlockhash(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && handleClick()}
        />
      </FormControl>
      <IconButton
        aria-label="submit"
        size="xs"
        disabled={
          state.provider!.historyProtocol!.accumulator.masterAccumulator().currentHeight() < 1
        }
        width={'20%'}
        onClick={handleClick}
        icon={<SearchIcon />}
      />
    </HStack>
  )
}
