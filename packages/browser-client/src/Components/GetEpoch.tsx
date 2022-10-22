import { HStack, Button, Input, useToast } from '@chakra-ui/react'
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
      <Button width="40%" onClick={sendFindEpoch}>
        Request Epoch Accumulator by index
      </Button>
      <Input
        type={'number'}
        min={1}
        max={state.provider!.historyProtocol.accumulator.historicalEpochs.length}
        placeholder={'Epoch'}
        onChange={(evt) => {
          setEpochIndex(parseInt(evt.target.value))
        }}
      />
    </HStack>
  )
}
