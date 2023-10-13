import { Box } from '@mui/material'
import { useEffect, useReducer } from 'react'
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
  httpMethods,
} from '../Contexts/RPCContext'

export default function HTTPClient() {
  const [state, dispatch] = useReducer(ClientReducer, ClientInitialState)
  const [rpcState, rpcDispatch] = useReducer(RPCReducer, RPCInitialState)
  const routingTable = ClientInitialState.RPC.http.portal_historyRoutingTableInfo.useMutation()
  const pingBootNodes = ClientInitialState.RPC.http.pingBootNodes.useMutation()
  useEffect(() => {
    pingBootNodes.mutateAsync({ port: rpcState.PORT, ip: rpcState.IP })
    setInterval(() => {
      routingTable.mutateAsync({ port: rpcState.PORT, ip: rpcState.IP })
    }, 10000)
  }, [])

  return (
    <ClientContext.Provider value={{ ...state, CONNECTION: 'http' }}>
      <ClientDispatchContext.Provider value={dispatch}>
        <RPCContext.Provider value={{ ...rpcState, REQUEST: httpMethods }}>
          <RPCDispatchContext.Provider value={rpcDispatch}>
            <Box height={'100vh'} width={'100%'} style={{ wordBreak: 'break-word' }}>
              <Client name={'HTTP Client'} />
            </Box>
          </RPCDispatchContext.Provider>
        </RPCContext.Provider>
      </ClientDispatchContext.Provider>
    </ClientContext.Provider>
  )
}
