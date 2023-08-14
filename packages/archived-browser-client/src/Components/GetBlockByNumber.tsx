import { SearchIcon } from '@chakra-ui/icons'
import { FormControl, HStack, IconButton, Input } from '@chakra-ui/react'
import React, { useContext, useState } from 'react'
import { AppContext, AppContextType, StateChange } from '../globalReducer'

export default function GetBlockByNumber() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const [searchNumber, setSearchNumber] = useState('1')

  async function eth_getBlockByNumber(blockNumber: string, includeTransactions: boolean) {
    try {
      const block = includeTransactions
        ? await state.provider!.getBlock(parseInt(blockNumber))
        : await state.provider!.getBlockWithTransactions(parseInt(blockNumber))
      dispatch({ type: StateChange.SETBLOCK, payload: block })
    } catch {
      return 'Block not found'
    }
  }

  async function handleClick() {
    dispatch({ type: StateChange.TOGGLELOADING })
    await eth_getBlockByNumber(searchNumber, true)
    dispatch({ type: StateChange.TOGGLELOADING })
  }

  return (
    <HStack width={'50%'} paddingY={0}>
      <FormControl isInvalid={parseInt(searchNumber) < 0}>
        <Input
          rounded="md"
          size={'xs'}
          bg="whiteAlpha.800"
          placeholder={'BlockNumber'}
          type={'number'}
          onChange={(e) => setSearchNumber(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && handleClick()}
        />
      </FormControl>
      <IconButton
        aria-label="submit"
        size="xs"
        width={'20%'}
        onClick={handleClick}
        icon={<SearchIcon />}
      />
    </HStack>
  )
}
