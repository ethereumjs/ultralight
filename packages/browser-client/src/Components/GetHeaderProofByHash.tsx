import { HStack, Button, FormControl, Input, useToast } from '@chakra-ui/react'
import { ContentLookup, fromHexString, HistoryNetworkContentKeyUnionType } from 'portalnetwork'
import React, { useContext, useState } from 'react'
import { HistoryProtocolContext } from '../ContextHooks'

export default function GetHeaderProofByHash() {
  const history = useContext(HistoryProtocolContext)
  const [blockHash, setBlockHash] = useState('')
  const toast = useToast()

  async function portal_getHeaderProof(blockHash: string) {
    const lookupKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 5,
      value: {
        chainId: 1,
        blockHash: fromHexString(blockHash),
      },
    })
    const lookup = new ContentLookup(history, lookupKey)
    const proof = await lookup.startLookup()
    const valid = await history.verifyInclusionProof(proof, blockHash)
    return valid
  }

  async function handleClick() {
    const valid = await portal_getHeaderProof(blockHash)
    if (valid === true) {
      toast({ title: `HeaderRecord validated!` })
    } else {
      toast({ title: `HeaderRecord NOT validated` })
    }
  }

  return (
    <HStack marginY={1}>
      <Button width={'40%'} onClick={handleClick}>
        Validate HeaderProof by BlockHash
      </Button>
      <FormControl isInvalid={!blockHash.startsWith('0x')}>
        <Input
          bg="whiteAlpha.800"
          placeholder={`BlockHash`}
          type={'string'}
          onChange={(e) => setBlockHash(e.target.value)}
        />
      </FormControl>
    </HStack>
  )
}
