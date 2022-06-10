import { Button, ButtonGroup, FormControl, HStack, Input } from '@chakra-ui/react'
import { Block } from '@ethereumjs/block'
import { CanonicalIndicesProtocol, ProtocolId } from 'portalnetwork'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'
import React, { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react'
import { BlockContext, PortalContext } from '../App'

interface IGetBlockByNumberProps {
  setBlockHash: Dispatch<SetStateAction<string>>
  setIsLoading: Dispatch<SetStateAction<boolean>>
}

export default function GetBlockByNumber(props: IGetBlockByNumberProps) {
  const [searchNumber, setSearchNumber] = useState('0')
  const { block, setBlock } = useContext(BlockContext)

  const portal = useContext(PortalContext)

  async function eth_getBlockByNumber(blockNumber: string, includeTransactions: boolean) {
    try {
      const canonicalIndices = portal.protocols.get(
        ProtocolId.CanonicalIndicesNetwork
      ) as CanonicalIndicesProtocol
      const blockHash = canonicalIndices.blockHash(parseInt(blockNumber))
      props.setBlockHash(blockHash!)
      const history = portal.protocols.get(ProtocolId.HistoryNetwork) as never as HistoryProtocol
      if (!blockHash) return 'Block not found'
      const block = await history.getBlockByHash(blockHash, includeTransactions)
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
