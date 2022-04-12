import { Button, Heading, Input, VStack } from '@chakra-ui/react'
import React, { Dispatch, SetStateAction } from 'react'

interface StartNodeProps {
  setProxy: Dispatch<SetStateAction<string>>
  init: () => Promise<void>
}

export default function StartNode(props: StartNodeProps) {
  return (
    <VStack>
      <Heading size="sm">Proxy Address</Heading>
      <Input
        onChange={(evt) => {
          props.setProxy(evt.target.value)
        }}
        textAlign="center"
        bg="whiteAlpha.800"
        defaultValue={'ultralight.ethdevops.io'}
        placeholder="Proxy IP Address"
      />
      <Button onClick={props.init}>Connect to Proxy</Button>
    </VStack>
  )
}
