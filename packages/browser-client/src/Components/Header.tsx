import React, { useContext } from 'react'
import {
  Button,
  Heading,
  useClipboard,
  useToast,
  VStack,
  HStack,
  Box,
  Center,
  IconButton,
} from '@chakra-ui/react'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import ContentManager from './ContentManager'
import ValidateAccumulator from './ValidateAccumulator'
import { AppContext, AppContextType } from '../globalReducer'
import { FaCopy, FaEye, FaShare } from 'react-icons/fa'

export default function Header() {
  const { state } = useContext(AppContext as React.Context<AppContextType>)
  const enr = state.provider!.portal!.discv5.enr.encodeTxt(
    state.provider!.portal!.discv5.keypair.privateKey
  )
  const { onCopy } = useClipboard(enr)
  const toast = useToast()
  async function share() {
    await Share.share({
      title: `Ultralight ENR`,
      text: enr,
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
      <HStack width={'100%'}>
        <VStack width={'25%'} padding={2}>
          {Capacitor.isNativePlatform() ? (
            <Button width="100%" rightIcon={<FaShare />} onClick={share}>
              ENR
            </Button>
          ) : (
            <Button width="100%" rightIcon={<FaCopy />} onClick={async () => handleCopy()}>
              ENR
            </Button>
          )}
          <IconButton
            aria-label="show"
            width="100%"
            onClick={() => {
              toast({ title: enr })
            }}
            icon={<FaEye />}
          />
        </VStack>
        <VStack width={'50%'}>
          <Heading size={'2xl'} textAlign="center">
            Ultralight
          </Heading>
          <Heading size={'l'} textAlign="center">
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
