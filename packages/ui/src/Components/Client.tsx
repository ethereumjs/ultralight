import { Container, ListItemText, Stack } from '@mui/material'
import { SelfNodeInfo } from './NodeInfo'
import FunctionTabs from './FunctionTabs'
import PortMenu from './Port'
import { ClientContext, ClientDispatchContext } from '../Contexts/ClientContext'
import React from 'react'
import { trpc } from '../utils/trpc'
import { RPCContext, RPCDispatchContext } from '../Contexts/RPCContext'
import Start from './Start'

export default function Client(props: { name: string }) {
  const dispatch = React.useContext(ClientDispatchContext)
  const state = React.useContext(ClientContext)

  if (state.CONNECTION === 'ws') {
    trpc.onTalkReq.useSubscription(undefined, {
      onData(data: any) {
        console.groupCollapsed(`Talk Request Received: ${data.topic} ${data.nodeId.slice(0, 6)}...`)
        console.dir(data)
        console.groupEnd()
        dispatch({
          type: 'LOG_RECEIVED',
          topic: data.topic,
          nodeId: data.nodeId,
          log: data.message,
        })
      },
      onStarted() {
        console.info('WS: onTalkReq subscription started')
      },
    })
    trpc.onTalkResp.useSubscription(undefined, {
      onData(data: any) {
        console.groupCollapsed(
          `Talk Response Received: ${data.topic} ${data.nodeId.slice(0, 6)}...`,
        )
        console.dir(data)
        console.groupEnd()
        dispatch({
          type: 'LOG_RECEIVED',
          topic: data.topic,
          nodeId: data.nodeId,
          log: data.message,
        })
      },
      onStarted() {
        console.info('onTalkResp subscription started')
      },
    })
    trpc.onSendTalkReq.useSubscription(undefined, {
      onData(data: any) {
        console.groupCollapsed(
          'Talk Request Sent:' + data.topic + ' ' + data.nodeId.slice(0, 6) + '...',
        )
        console.dir(data)
        console.groupEnd()
        dispatch({
          type: 'LOG_SENT',
          topic: data.topic,
          nodeId: data.nodeId,
          log: data.payload,
        })
      },
      onStarted() {
        console.info('onSendTalkReq subscription started')
      },
    })
    trpc.onSendTalkResp.useSubscription(undefined, {
      onData(data: any) {
        console.groupCollapsed(
          'Talk Response Sent:' + data.topic + ' ' + data.nodeId.slice(0, 6) + '...',
        )
        console.dir(data)
        console.groupEnd()

        dispatch({
          type: 'LOG_SENT',
          topic: data.topic,
          nodeId: data.nodeId,
          log: data.payload,
        })
      },
      onStarted() {
        console.info('onSendTalkResp subscription started')
      },
    })
    trpc.onContentAdded.useSubscription(undefined, {
      onData(data: any) {
        const type =
          data.contentType === 0
            ? 'BlockHeader'
            : data.contentType === 1
            ? 'BlockBody'
            : data.contentType === 2
            ? 'BlockReceipts'
            : data.contentType === 3
            ? 'EpochAccumulator'
            : 'unknown'
        dispatch({
          type: 'CONTENT_STORE',
          contentKey: '0x0' + data.contentType + data.key.slice(2),
          content: { type, added: new Date().toString().split(' ').slice(1, 5).join(' ') },
        })
      },
      onStarted() {
        console.info('onContentAdded subscription started')
      },
    })
    trpc.onNodeAdded.useSubscription(undefined, {
      onData({ nodeId, networkId }) {
        console.info('node added: ', nodeId)
      },
      onStarted() {
        console.info('onNodeAdded subscription started')
      },
    })
  }
  return (
    <Container sx={{ width: '100%' }} id="Client">
      {!state.CONNECTED ? (
        <Start />
      ) : (
        <Stack width={'100%'} direction={'column'}>
          <ListItemText primary={props.name} />
          {props.name === 'HTTP Client' && <PortMenu />}
          <Container sx={{ width: '100%' }}>
            <SelfNodeInfo />
          </Container>
          <Container sx={{ width: '100%' }}>
            <FunctionTabs />
          </Container>
        </Stack>
      )}
    </Container>
  )
}
