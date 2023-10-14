import { Container, ListItemText, Stack } from '@mui/material'
import { SelfNodeInfo } from './NodeInfo'
import FunctionTabs from './FunctionTabs'
import PortMenu from './Port'
import { ClientContext, ClientDispatchContext } from '../Contexts/ClientContext'
import React from 'react'
import { trpc } from '../utils/trpc'
import { RPCContext, RPCDispatchContext } from '../Contexts/RPCContext'

export default function Client(props: { name: string }) {
  const dispatch = React.useContext(ClientDispatchContext)
  const state = React.useContext(ClientContext)
  const rpcState = React.useContext(RPCContext)
  const rpcDispatch = React.useContext(RPCDispatchContext)

  if (state.CONNECTION === 'ws') {
    trpc.onTalkReq.useSubscription(undefined, {
      onData(data: any) {
        console.log('Talk Request Received', data.topic)
        dispatch({
          type: 'LOG_RECEIVED',
          topic: data.topic,
          nodeId: data.nodeId,
          log: data.message,
        })
      },
      onStarted() {
        console.log('onTalkReq subscription started')
      },
    })
    trpc.onTalkResp.useSubscription(undefined, {
      onData(data: any) {
        console.log('Talk Response Received', data.topic)
        dispatch({
          type: 'LOG_RECEIVED',
          topic: data.topic,
          nodeId: data.nodeId,
          log: data.message,
        })
      },
      onStarted() {
        console.log('onTalkResp subscription started')
      },
    })
    trpc.onSendTalkReq.useSubscription(undefined, {
      onData(data: any) {
        console.log('sent talk request', data.topic)
        dispatch({
          type: 'LOG_SENT',
          topic: data.topic,
          nodeId: data.nodeId,
          log: data.payload,
        })
      },
      onStarted() {
        console.log('onSendTalkReq subscription started')
      },
    })
    trpc.onSendTalkResp.useSubscription(undefined, {
      onData(data: any) {
        console.log('sent talk response', data.topic)
        dispatch({
          type: 'LOG_SENT',
          topic: data.topic,
          nodeId: data.nodeId,
          log: data.payload,
        })
      },
      onStarted() {
        console.log('onSendTalkResp subscription started')
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
        console.log('onContentAdded subscription started')
      },
    })
    trpc.onNodeAdded.useSubscription(undefined, {
      onData({ nodeId, protocolId }) {
        console.log('node added', nodeId, protocolId)
      },
      onStarted() {
        console.log('onNodeAdded subscription started')
      },
    })
  }
  return (
    <Container sx={{ width: '100%' }} id="Client">
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
    </Container>
  )
}
