import { Button, FormControl, HStack, Input } from '@chakra-ui/react'
import { ProtocolId } from 'portalnetwork'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'
import React, { Dispatch, SetStateAction, useContext, useState } from 'react'
import { BlockContext, PortalContext } from '../App'

interface IGetBlockByNumberProps {
  setBlockHash: Dispatch<SetStateAction<string>>
  setIsLoading: Dispatch<SetStateAction<boolean>>
}

export default function GetBlockByNumber(props: IGetBlockByNumberProps) {
  const [searchNumber, setSearchNumber] = useState('0')
  const { setBlock } = useContext(BlockContext)

  const portal = useContext(PortalContext)

  // Adapted from rpc method in cli.

  async function eth_getBlockByNumber(blockNumber: string, includeTransactions: boolean) {
    try {
      const history = portal.protocols.get(ProtocolId.HistoryNetwork) as never as HistoryProtocol
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
      <Button width={'100%'} onClick={handleClick}>
        Get Block by Number
      </Button>
      <FormControl isInvalid={parseInt(searchNumber) < 0}>
        <Input
          bg="whiteAlpha.800"
          placeholder={'209999'}
          type={'number'}
          value={searchNumber}
          onChange={(e) => setSearchNumber(e.target.value)}
        />
      </FormControl>
    </HStack>
  )
}
