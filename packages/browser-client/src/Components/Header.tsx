import React from 'react'
import {
  Button,
  Heading,
  useClipboard,
  useToast,
  VStack,
  HStack,
  Box,
  Center,
} from '@chakra-ui/react'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import ContentManager from './ContentManager'

interface HeaderProps {
  enr: string
}
export default function Header(props: HeaderProps) {
  const { onCopy } = useClipboard(props.enr)
  const toast = useToast()
  async function share() {
    await Share.share({
      title: `Ultralight ENR`,
      text: props.enr,
      dialogTitle: `Share ENR`,
    })
  }
  const copy = async () => {
    onCopy()
  }
  async function handleCopy() {
    await copy()
    toast({
      title: `ENR copied`,
      status: 'success',
      duration: 1500,
      isClosable: true,
      position: 'bottom-right',
      variant: 'solid',
    })
  }
  return (
    <Center bg={'gray.200'}>
      <HStack width={'90%'}>
        {Capacitor.isNativePlatform() ? (
          <Button width={`25%`} onClick={share}>
            SHARE ENR
          </Button>
        ) : (
          <Button width={'25%'} onClick={async () => handleCopy()}>
            COPY ENR
          </Button>
        )}
        <VStack width={'50%'}>
          <Heading size={'2xl'} textAlign="start">
            Ultralight
          </Heading>
          <Heading size={'l'} textAlign="start">
            Portal Network Explorer
          </Heading>
        </VStack>
        <Box width={'25%'}>
          <ContentManager />
        </Box>
      </HStack>
    </Center>
  )
}
