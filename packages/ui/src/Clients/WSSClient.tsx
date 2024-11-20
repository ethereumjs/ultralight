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

  const localRoutingTable = ClientInitialState.RPC.ws.portal_historyRoutingTableInfo.useMutation()

  const getLocalRoutingTable = async () => {
    const _peers = await localRoutingTable.mutateAsync()
    dispatch({
      type: 'ROUTING_TABLE',
      routingTable: _peers,
    })
  }
  const node = trpc.browser_nodeInfo.useMutation()
  const getSelf = async () => {
    const nodeInfo = await node.mutateAsync({})
    dispatch({
      type: 'NODE_INFO',
      ...nodeInfo,
    })
  }

  const bootUP = () => {
    clearInterval('update')
    getSelf()
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
