import { HStack, Button, useToast } from '@chakra-ui/react'
import {
  ContentLookup,
  fromHexString,
  HistoryNetworkContentKeyType,
  SszProof,
} from 'portalnetwork'
import React, { useContext } from 'react'
import { AppContext, AppContextType } from '../globalReducer'

export default function GetHeaderProofByHash() {
  const { state } = useContext(AppContext as React.Context<AppContextType>)
  const blockHash = state.block!.hash
  const toast = useToast()

  async function portal_getHeaderProof(blockHash: string) {
    const lookupKey = HistoryNetworkContentKeyType.serialize({
      selector: 5,
      value: {
        blockHash: fromHexString(blockHash),
      },
    })
    const lookup = new ContentLookup(state.provider!.historyProtocol!, lookupKey)
    const proof = await lookup.startLookup()
    const valid = await state.provider!.historyProtocol!.accumulator.verifyInclusionProof(
      SszProof.deserialize(proof as Uint8Array),
      blockHash
    )
    return valid
  }

  async function handleClick() {
    const valid = await portal_getHeaderProof(blockHash)
    if (valid === true) {
      toast({
        title: `Header Record validated!`,
        status: 'info',
        duration: 3000,
        position: 'bottom',
      })
    } else {
      toast({
        title: `Header Record NOT validated`,
        status: 'error',
        duration: 3000,
        position: 'bottom',
      })
    }
  }

  return (
    <HStack marginY={1}>
      <Button width={'100%'} onClick={handleClick}>
        Validate Header Proof
      </Button>
    </HStack>
  )
}
