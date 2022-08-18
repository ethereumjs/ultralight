import { Share } from '@capacitor/share'
import { Button, useToast, VStack } from '@chakra-ui/react'
import React, { Dispatch, SetStateAction, useState } from 'react'
import ContentManager from './ContentManager'

interface DevToolsProps {
  copy: () => Promise<void>
  enr: string
  peerEnr: string
  setPeerEnr: Dispatch<SetStateAction<string>>
  handleClick: () => Promise<void>
  native: boolean
}

export default function DevTools(props: DevToolsProps) {
  const [canShare, setCanShare] = useState(false)
  const toast = useToast()

  async function share() {
    await Share.share({
      title: `Ultralight ENR`,
      text: props.enr,
      dialogTitle: `Share ENR`,
    })
  }

  async function handleCopy() {
    await props.copy()
    toast({
      title: `ENR copied`,
      status: 'success',
      duration: 1500,
      isClosable: true,
      position: 'bottom-right',
      variant: 'solid',
    })
  }

  async function sharing() {
    const s = await Share.canShare()
    setCanShare(s.value)
  }

  React.useEffect(() => {
    sharing()
  }, [])

  return (
    <VStack>
      {canShare ? (
        <Button width={`100%`} onClick={share}>
          SHARE ENR
        </Button>
      ) : (
        <Button onClick={async () => handleCopy()} width={'100%'}>
          COPY ENR
        </Button>
      )}
      <ContentManager />
    </VStack>
  )
}
