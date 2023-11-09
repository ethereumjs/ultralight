import { SearchIcon } from '@chakra-ui/icons'
import { HStack, Input, useToast, IconButton } from '@chakra-ui/react'
import {
  ContentLookup,
  HistoryNetworkContentType,
  EpochAccumulator,
  epochRootByIndex,
  fromHexString,
  getContentKey,
  HistoryNetwork,
  MAX_HISTORICAL_EPOCHS,
  NetworkId,
  toHexString,
} from 'portalnetwork'
import React, { useState, useContext } from 'react'
import { AppContext, AppContextType } from '../globalReducer'

export default function GetEpoch() {
  const { state } = useContext(AppContext as React.Context<AppContextType>)
  const [epochIndex, setEpochIndex] = useState(0)
  const toast = useToast()

  async function sendFindEpoch(): Promise<string> {
    const epochRootHash = await epochRootByIndex(epochIndex)
    const network = state.provider!.portal.networks.get(
      NetworkId.HistoryNetwork,
    ) as HistoryNetwork
    const lookup = new ContentLookup(
      network,
      fromHexString(getContentKey(HistoryNetworkContentType.EpochAccumulator, epochRootHash)),
    )
    const epoch = await lookup.startLookup()
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
