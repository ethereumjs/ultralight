import { Button, useToast } from '@chakra-ui/react'
import React, { useContext } from 'react'
import { AppContext } from '../globalReducer'

export default function ValidateAccumulator() {
  const { state } = useContext(AppContext)
  const toast = useToast()

  const handleClick = async () => {
    const history = state!.historyProtocol!
    if (history.accumulator) {
      const valid = await history.accumulator.verifySnapshot(
        history.accumulator.masterAccumulator()
      )
      if (valid === true) {
        toast({
          title: `Header Accumulator validated at height ${history.accumulator.currentHeight}!`,
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
