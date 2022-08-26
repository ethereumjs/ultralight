import { Box, Button, FormControl, HStack, Input, useToast } from '@chakra-ui/react'
import React, { useContext, useState } from 'react'
import { HistoryProtocolContext } from '../ContextHooks'

export default function ValidateAccumulator() {
  const history = useContext(HistoryProtocolContext)
  const [blockHash, setBlockHash] = useState('')
  const toast = useToast()

  const handleClick = async () => {
    const valid = await history.verifySnapshot(history.accumulator)
    if (valid === true) {
      toast({ title: 'Validated!' })
    } else {
      toast({ title: 'Unable to validate' })
    }
  }

  return (
    <>
      {history.accumulator ? (
        <Button disabled={history.accumulator.historicalEpochs.length < 1} onClick={handleClick}>
          Validate HeaderAccumulator
        </Button>
      ) : (
        <Button disabled>Validate HeaderAccumulator</Button>
      )}
    </>
  )
}
