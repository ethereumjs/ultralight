import { SearchIcon } from '@chakra-ui/icons'
import { HStack, Button, Input, useToast, IconButton } from '@chakra-ui/react'
import { EpochAccumulator, toHexString } from 'portalnetwork'
import React, { useContext, useState } from 'react'
import { AppContext, AppContextType } from '../globalReducer'
import { PeerStateChange } from '../peerReducer'

export default function GetEpoch() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const [epochIndex, setEpochIndex] = useState(0)
  const toast = useToast()

  async function sendFindEpoch(): Promise<string> {
    const epoch = await state.provider!.historyProtocol.getEpochByIndex(epochIndex)
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
        max={state.provider!.historyProtocol.accumulator.historicalEpochs.length}
        placeholder={'0'}
        onChange={(evt) => {
          setEpochIndex(parseInt(evt.target.value))
        }}
        onKeyUp={(e) => e.key === 'Enter' && sendFindEpoch()}
      />
      <IconButton
        aria-label="submit"
        size="sm"
        disabled={
          state.provider!.historyProtocol!.accumulator.masterAccumulator().currentHeight() < 1
        }
        width={'20%'}
        onClick={sendFindEpoch}
        icon={<SearchIcon />}
      />
    </HStack>
  )
}
