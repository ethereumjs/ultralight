import { SearchIcon } from '@chakra-ui/icons'
import { HStack, Input, useToast, IconButton } from '@chakra-ui/react'
import {
  EpochAccumulator,
  epochRootByBlocknumber,
  MAX_HISTORICAL_EPOCHS,
  toHexString,
} from 'portalnetwork'
import React, { useState } from 'react'

export default function GetEpoch() {
  const [epochIndex, setEpochIndex] = useState(0)
  const toast = useToast()

  async function sendFindEpoch(): Promise<string> {
    const epoch = await epochRootByBlocknumber(BigInt(epochIndex))
    if (epoch !== undefined) {
      const acc = EpochAccumulator.deserialize(epoch as Uint8Array)
      toast({
        title: toHexString(EpochAccumulator.hashTreeRoot(acc)),
      })
      return toHexString(EpochAccumulator.hashTreeRoot(acc))
    } else {
      toast({
        title: 'Epoch Not Found',
      })
      return ''
    }
  }

  return (
    <HStack marginY={1}>
      <Input
        type={'number'}
        min={1}
        max={MAX_HISTORICAL_EPOCHS}
        placeholder={'0'}
        onChange={(evt) => {
          setEpochIndex(parseInt(evt.target.value))
        }}
        onKeyUp={(e) => e.key === 'Enter' && sendFindEpoch()}
      />
      <IconButton
        aria-label="submit"
        size="sm"
        width={'20%'}
        onClick={sendFindEpoch}
        icon={<SearchIcon />}
      />
    </HStack>
  )
}
