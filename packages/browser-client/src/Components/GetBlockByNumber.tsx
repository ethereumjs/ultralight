import { SearchIcon } from '@chakra-ui/icons'
import { FormControl, HStack, IconButton, Input, useToast } from '@chakra-ui/react'
import React, { useContext, useState } from 'react'
import { AppContext, AppContextType, StateChange } from '../globalReducer'

export default function GetBlockByNumber() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const [searchNumber, setSearchNumber] = useState(
    state.provider!.historyProtocol!.accumulator.masterAccumulator().currentHeight().toString()
  )
  const toast = useToast()

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
    if (
      parseInt(searchNumber) >
      state.provider!.historyProtocol!.accumulator!.masterAccumulator().currentHeight()
    ) {
      toast({
        title: 'Invalid Block Number',
        status: 'error',
        description: 'Block number higher than current known chain height',
        duration: 3000,
        position: 'bottom',
      })
      setSearchNumber('')
      return
    }
    dispatch({ type: StateChange.TOGGLELOADING })
    await eth_getBlockByNumber(searchNumber, true)
    dispatch({ type: StateChange.TOGGLELOADING })
  }

  return (
    <HStack width={'50%'} marginY={1}>
      <FormControl isInvalid={parseInt(searchNumber) < 0}>
        <Input
          bg="whiteAlpha.800"
          placeholder={`BlockNumber (Max: ${state
            .provider!.historyProtocol!.accumulator.masterAccumulator()
            .currentHeight()})`}
          type={'number'}
          onChange={(e) => setSearchNumber(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && handleClick()}
        />
      </FormControl>
      <IconButton
        aria-label="submit"
        size="sm"
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
