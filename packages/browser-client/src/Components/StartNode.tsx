import { Button, Heading, Input, VStack } from '@chakra-ui/react'
import React, { Dispatch, SetStateAction } from 'react'

interface StartNodeProps {
  setProxy: Dispatch<SetStateAction<string>>
  init: () => Promise<void>
}

export default function StartNode(props: StartNodeProps) {
  return (
    <VStack spacing={0}>
      <Heading size="sm">Proxy Address</Heading>
      <Input
        onChange={(evt) => {
          props.setProxy(evt.target.value)
        }}
        size="xs"
        textAlign="center"
        bg="whiteAlpha.800"
        defaultValue={'ws://127.0.0.1:5050'}
        placeholder="Proxy IP Address"
      />
      <Button width={'100%'} onClick={props.init}>
        Connect to Proxy
      </Button>
    </VStack>
  )
}
