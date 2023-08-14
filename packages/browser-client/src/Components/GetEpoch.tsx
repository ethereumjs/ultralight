import { SearchIcon } from '@chakra-ui/icons'
import { HStack, Input, useToast, IconButton } from '@chakra-ui/react'
import {
  ContentLookup,
  ContentType,
  EpochAccumulator,
  epochRootByIndex,
  fromHexString,
  getContentKey,
  HistoryProtocol,
  MAX_HISTORICAL_EPOCHS,
  ProtocolId,
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
    const protocol = state.provider!.portal.protocols.get(
      ProtocolId.HistoryNetwork,
    ) as HistoryProtocol
    const lookup = new ContentLookup(
      protocol,
      fromHexString(getContentKey(ContentType.EpochAccumulator, epochRootHash)),
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
