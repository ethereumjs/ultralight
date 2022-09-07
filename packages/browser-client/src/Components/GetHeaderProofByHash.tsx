import { HStack, Button, useToast } from '@chakra-ui/react'
import {
  ContentLookup,
  fromHexString,
  HistoryNetworkContentKeyUnionType,
  SszProof,
  toHexString,
} from 'portalnetwork'
import React, { useContext } from 'react'
import { AppContext } from '../globalReducer'

export default function GetHeaderProofByHash() {
  const { state, dispatch } = useContext(AppContext)
  const blockHash = toHexString(state!.block!.header.hash())
  const toast = useToast()

  async function portal_getHeaderProof(blockHash: string) {
    const lookupKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 5,
      value: {
        chainId: 1,
        blockHash: fromHexString(blockHash),
      },
    })
    const lookup = new ContentLookup(state!.historyProtocol!, lookupKey)
    const proof = await lookup.startLookup()
    const valid = await state!.historyProtocol!.accumulator.verifyInclusionProof(
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
