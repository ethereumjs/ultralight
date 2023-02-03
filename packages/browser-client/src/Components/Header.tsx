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
  Text,
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
              toast({ title: enr, duration: 5000, isClosable: true })
            }}
            icon={<FaEye />}
          />
        </VStack>
        <VStack spacing={0} width={'50%'}>
          <Heading size={'lg'} textAlign="center">
            Ultralight
          </Heading>
          <HStack>
            <VStack width="60%">
              <Heading size={'sm'} textAlign="center">
                {enr.slice(0, 10)}
              </Heading>
              <Heading size={'xs'} textAlign="center">
                {state.provider!.portal!.discv5.enr.nodeId.slice(0, 10)}
              </Heading>
            </VStack>
            <Text width="40%" wordBreak={'break-all'}>
              {state.provider!.portal!.discv5.enr.getLocationMultiaddr('udp')?.toString()}
            </Text>
          </HStack>
        </VStack>
        <Box width={'25%'}>
          <ContentManager />
        </Box>
      </HStack>
    </Center>
  )
}
