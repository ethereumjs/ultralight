import { Box } from '@mui/material'
import { trpc } from '../utils/trpc'
import { useEffect, useReducer, useState } from 'react'
import Client from '../Components/Client'
import {
  ClientContext,
  ClientDispatchContext,
  ClientInitialState,
  ClientReducer,
} from '../Contexts/ClientContext'
import {
  RPCContext,
  RPCDispatchContext,
  RPCInitialState,
  RPCReducer,
  wsMethods,
} from '../Contexts/RPCContext'

export function WSSClient() {
  const [state, dispatch] = useReducer(ClientReducer, ClientInitialState)
  const [rpcState, rpcDispatch] = useReducer(RPCReducer, RPCInitialState)

  useEffect(() => {
    bootUP()
  }, [])

  const boot = ClientInitialState.RPC.ws.pingBootNodes.useMutation()
  const sendPing = ClientInitialState.RPC.ws.portal_historyPing.useMutation()
  const localRoutingTable = ClientInitialState.RPC.ws.portal_historyRoutingTableInfo.useMutation()

  const pingBootNodes = async () => {
    const bootnodeResponses = await boot.mutateAsync()
    dispatch({
      type: 'BOOTNODES',
      bootnodes: bootnodeResponses,
    })
    getLocalRoutingTable()
  }

  const startSubs = () => {
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
        console.log('onNodeAdded', { nodeId, protocolId })
      },
      onStarted() {
        console.log('onNodeAdded subscription started')
      },
    })
  }

  const getLocalRoutingTable = async () => {
    const _peers = await localRoutingTable.mutateAsync()
    dispatch({
      type: 'ROUTING_TABLE',
      routingTable: _peers,
    })
  }
  const node = trpc.browser_nodeInfo.useMutation()
  const getSelf = async () => {
    const nodeInfo = await node.mutateAsync()
    dispatch({
      type: 'NODE_INFO',
      ...nodeInfo,
    })
  }

  const bootUP = () => {
    clearInterval('update')
    getSelf()
    pingBootNodes()
    getLocalRoutingTable()
    const update = setInterval(() => {
      getLocalRoutingTable()
    }, 10000)
  }

  return (
    <ClientContext.Provider value={{ ...state, CONNECTION: 'ws', REQUEST: wsMethods }}>
      <ClientDispatchContext.Provider value={dispatch}>
        <RPCContext.Provider value={rpcState}>
          <RPCDispatchContext.Provider value={rpcDispatch}>
            <Box height={'100vh'} width={'100%'} style={{ wordBreak: 'break-word' }}>
              <Client name={'WebSockets Client'} />
            </Box>
          </RPCDispatchContext.Provider>
        </RPCContext.Provider>
      </ClientDispatchContext.Provider>
    </ClientContext.Provider>
  )
}
