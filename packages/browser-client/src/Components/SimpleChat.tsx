import React, { useContext, useMemo } from 'react'
import { ENR, SimpleTransportService } from 'portalnetwork'
import { AppContext, AppContextType } from '../globalReducer'
import {
  VStack,
  Heading,
  UnorderedList,
  ListItem,
  InputGroup,
  Input,
  Button,
  Text,
  HStack,
} from '@chakra-ui/react'

export default function SimpleChat() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)

  const simple = useMemo(() => {
    return (state.provider?.portal.discv5.sessionService.transport as SimpleTransportService)
      .rtcTransport
  }, [state.provider])
  const _ENR = useMemo(() => {
    try {
      return state.provider?.portal.discv5.enr.encodeTxt(
        state.provider?.portal.discv5.enr.keypair.privateKey
      )
    } catch {
      return state.provider?.portal.discv5.enr.encodeTxt()
    }
  }, [state.provider, state.provider?.portal.discv5.enr.encodeTxt()])

  function sendMessage() {
    simple?.RTC.sendMessage()
  }

  return (
    <>
      {simple && (
        <VStack marginInlineStart={2} width="100%" alignItems={'start'}>
          <Text fontSize="sm" wordBreak={'break-all'}>
            ENR: {_ENR?.slice(0, 20)}...
          </Text>
          <Text fontSize="sm" wordBreak={'break-all'}>
            NodeId: {_ENR && ENR.decodeTxt(_ENR).nodeId}
          </Text>
          <Text fontSize="sm" wordBreak={'break-all'}>
            p2pt._peerId: {simple.RTC.p2pt._peerId.slice(0, 10)}
          </Text>
          <Text fontSize="sm" wordBreak={'break-all'}>
            multiaddr: {simple.multiaddr.toString()}
          </Text>
          <Heading size={'sm'}>{Object.keys(simple.RTC.peers).length} Peers</Heading>
          <Text fontSize="sm" wordBreak={'break-all'}>
            RTC.peers:{' '}
          </Text>
          <HStack width="100%" overflowX="scroll">
            {Object.keys(simple.RTC.peers).map((k, idx) => {
              return (
                <VStack padding="1" margin="2" alignItems="start" border="1px" key={k}>
                  <Text>{k.slice(0, 10)}</Text>
                  <Text>
                    {Object.keys(simple.RTC.memberIds)[idx] &&
                      ENR.decodeTxt(Object.keys(simple.RTC.memberIds)[idx])
                        ?.getLocationMultiaddr('udp')
                        ?.toString()}
                  </Text>
                  <Text>{Object.values(simple.RTC.members)[idx]?.slice(0, 20)}...</Text>
                  <Text>{Object.values(simple.RTC.memberIds)[idx]?.slice(0, 20)}...</Text>
                </VStack>
              )
            })}
          </HStack>
          <Heading size="sm">{simple.RTC.status}</Heading>
          <VStack height="30vh" overflowY={'scroll'} border="2px">
            <UnorderedList>
              {simple.RTC.messages.map((message, idx) => {
                return (
                  <ListItem key={idx}>
                    <Heading
                      color={message.username === simple.RTC.username ? 'red' : 'black'}
                      size="sm"
                    >
                      {message.username === simple.RTC.username
                        ? 'ME'
                        : message.username.slice(0, 10)}
                    </Heading>
                    <Text
                      wordBreak={'break-all'}
                      color={message.username === simple.RTC.username ? 'red' : 'black'}
                    >
                      {message.message}
                    </Text>
                  </ListItem>
                )
              })}
            </UnorderedList>
          </VStack>
          <Input
            //   id="btn-input"
            type="text"
            name="message"
            className="form-control input-sm"
            placeholder="Type your message here..."
            // v-model="newMessage"
            onChange={(e) => {
              simple.RTC.setNewMessage(e.target.value)
            }}
            onKeyDown={(e) => e.key === 'Enter' && simple.RTC.sendMessage()}
          />
        </VStack>
      )}
    </>
  )
}
