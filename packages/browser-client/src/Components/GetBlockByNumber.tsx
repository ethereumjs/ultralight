import { Button, FormControl, HStack, Input } from '@chakra-ui/react'
import { ProtocolId } from 'portalnetwork'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'
import React, { Dispatch, SetStateAction, useContext, useState } from 'react'
import { BlockContext, HistoryProtocolContext } from '../App'

interface IGetBlockByNumberProps {
  setBlockHash: Dispatch<SetStateAction<string>>
  setIsLoading: Dispatch<SetStateAction<boolean>>
}

export default function GetBlockByNumber(props: IGetBlockByNumberProps) {
  const history = useContext(HistoryProtocolContext)
  const [searchNumber, setSearchNumber] = useState(history.accumulator.currentHeight().toString())
  const { setBlock } = useContext(BlockContext)

  async function eth_getBlockByNumber(blockNumber: string, includeTransactions: boolean) {
    try {
      const block = await history.getBlockByNumber(parseInt(blockNumber), includeTransactions)
      setBlock(block!)
    } catch {
      return 'Block not found'
    }
  }

  async function handleClick() {
    props.setIsLoading(true)
    await eth_getBlockByNumber(searchNumber, true)
    props.setIsLoading(false)
  }

  return (
    <HStack marginY={1}>
      <Button
        disabled={history.accumulator.currentHeight() < 1}
        width={'100%'}
        onClick={handleClick}
      >
        Get Block by Number
      </Button>
      <FormControl isInvalid={parseInt(searchNumber) < 0}>
        <Input
          bg="whiteAlpha.800"
          placeholder={`BlockNumber (Max: ${history.accumulator.currentHeight()})`}
          type={'number'}
          onChange={(e) => setSearchNumber(e.target.value)}
        />
      </FormControl>
    </HStack>
  )
}
