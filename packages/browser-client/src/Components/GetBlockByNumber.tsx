import { Button, FormControl, HStack, Input, useToast } from '@chakra-ui/react'
import React, { useContext, useState } from 'react'
import { AppContext, StateChange } from '../globalReducer'

export default function GetBlockByNumber() {
  const { state, dispatch } = useContext(AppContext)
  const [searchNumber, setSearchNumber] = useState(
    state!.historyProtocol!.accumulator.masterAccumulator().currentHeight().toString()
  )
  const toast = useToast()

  async function eth_getBlockByNumber(blockNumber: string, includeTransactions: boolean) {
    try {
      const block = await state!.historyProtocol!.ETH.getBlockByNumber(
        parseInt(blockNumber),
        includeTransactions
      )
      dispatch!({ type: StateChange.SETBLOCK, payload: block })
    } catch {
      return 'Block not found'
    }
  }

  async function handleClick() {
    if (
      parseInt(searchNumber) >
      state!.historyProtocol!.accumulator!.masterAccumulator().currentHeight()
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
    dispatch!({ type: StateChange.TOGGLELOADING })
    await eth_getBlockByNumber(searchNumber, true)
    dispatch!({ type: StateChange.TOGGLELOADING })
  }

  return (
    <HStack marginY={1}>
      <Button
        disabled={state!.historyProtocol!.accumulator.masterAccumulator().currentHeight() < 1}
        width={'40%'}
        onClick={handleClick}
      >
        Get Block by Number
      </Button>
      <FormControl isInvalid={parseInt(searchNumber) < 0}>
        <Input
          bg="whiteAlpha.800"
          placeholder={`BlockNumber (Max: ${state!
            .historyProtocol!.accumulator.masterAccumulator()
            .currentHeight()})`}
          type={'number'}
          onChange={(e) => setSearchNumber(e.target.value)}
        />
      </FormControl>
    </HStack>
  )
}
