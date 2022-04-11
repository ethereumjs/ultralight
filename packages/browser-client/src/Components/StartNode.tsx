import { Box, Center, Button, Input } from '@chakra-ui/react'
import React, { Dispatch, SetStateAction } from 'react'

interface StartNodeProps {
  setProxy: Dispatch<SetStateAction<string>>
  init: () => Promise<void>
}

export default function StartNode(props: StartNodeProps) {
  return (
    <>
      <Box>
        <Input
          onChange={(evt) => {
            props.setProxy(evt.target.value)
          }}
          textAlign="center"
          bg="whiteAlpha.800"
          defaultValue={'ultralight.ethdevops.io'}
          placeholder="Proxy IP Address"
        />
        <Center>
          <Button onClick={props.init}>Start Node</Button>
        </Center>
      </Box>
    </>
  )
}
