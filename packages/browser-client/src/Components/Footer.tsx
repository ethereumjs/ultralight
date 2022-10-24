import { Text, HStack, IconButton, Link, VStack, Button, Input } from '@chakra-ui/react'
import React, { useContext, useState } from 'react'
import { FaDiscord, FaGithub, FaGithubSquare, FaTwitter } from 'react-icons/fa'
import { AppContext, AppContextType, StateChange } from '../globalReducer'

export default function Footer() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const [enr, setEnr] = useState('')

  async function connectToPeer() {
    try {
      await state.provider?.historyProtocol.addBootNode(state.searchEnr)
      dispatch({ type: StateChange.SETSEARCHENR, payload: '' })
      dispatch({ type: StateChange.REFRESHPEERS })
    } catch (err) {}
  }

  return (
    <VStack paddingY={'4px'} width="100%" opacity={1} bg="gray.500">
      <Button
        width={'90%'}
        border="gray.500"
        bgColor={'blue.100'}
        size={'lg'}
        marginBottom={'2px'}
        onClick={connectToPeer}
      >
        Connect to new peer
      </Button>
      <Input
        rounded={'md'}
        width={'90%'}
        bg="white"
        border="2px"
        size={'xs'}
        type="text"
        style={{ marginTop: '0' }}
        placeholder={'enr: IS...'}
        value={state.searchEnr}
        onChange={(e) => {
          dispatch({ type: StateChange.SETSEARCHENR, payload: e.target.value })
        }}
      />
      <HStack width={'100%'} bg={'gray.100'} justifyContent={'space-evenly'}>
        <Link href="https://twitter.com/EthereumJs">
          <IconButton aria-label="EthereumJs Twitter" icon={<FaTwitter />} />
        </Link>
        <Link href="https://twitter.com/EthereumJs">
          <IconButton aria-label="EthereumJs Discord" icon={<FaDiscord />} />
        </Link>
        <Text>Made by EthereumJS</Text>
        <Link href="https://github.com/EthereumJS/Ultralight">
          <IconButton aria-label="Ultralight GitHub" icon={<FaGithubSquare />} />
        </Link>
        <Link href="https://github.com/EthereumJS">
          <IconButton aria-label="EthereumJs GitHub" icon={<FaGithub />} />
        </Link>
      </HStack>
    </VStack>
  )
}
