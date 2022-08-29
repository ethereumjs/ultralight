import { Button, useToast } from '@chakra-ui/react'
import { HistoryProtocol, ProtocolId } from 'portalnetwork'
import React, { useContext } from 'react'
import { PortalContext } from '../ContextHooks'

export default function ValidateAccumulator() {
  const portal = useContext(PortalContext)
  const toast = useToast()

  const handleClick = async () => {
    const history = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    if (history.accumulator) {
      const valid = await history.verifySnapshot(history.accumulator)
      if (valid === true) {
        toast({
          title: `Header Accumulator validated at height ${history.accumulator.currentHeight()}!`,
          status: 'info',
          duration: 3000,
          position: 'bottom',
        })
      } else {
        toast({
          title: 'Unable to validate header accumulator',
          status: 'error',
          duration: 3000,
          position: 'bottom',
        })
      }
    }
  }

  return <Button onClick={handleClick}>Validate HeaderAccumulator</Button>
}
