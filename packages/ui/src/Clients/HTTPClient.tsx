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
  const routingTable = ClientInitialState.RPC.http.local_routingTable.useMutation()
  const pingBootNodes = ClientInitialState.RPC.http.pingBootNodes.useMutation()
  const getEnr = ClientInitialState.RPC.http.portal_historyGetEnr.useMutation()
  async function updateRT() {
    console.log('updating routing table')
    const rt = await routingTable.mutateAsync({ port: rpcState.PORT, ip: rpcState.IP })
    console.log({ rt })
    const rtEnrs = await Promise.allSettled(
      rt.map(async ([nodeId, bucket]) => {
        const res = await getEnr.mutateAsync({
          port: rpcState.PORT,
          ip: rpcState.IP,
          nodeId,
        })
        const enr = res
        return enr instanceof Object
          ? [nodeId, [enr.c, enr.enr, enr.nodeId, enr.multiaddr, bucket]]
          : [nodeId, ['N/A', 'N/A', nodeId, 'N/A', bucket]]
      }),
    )

    console.log({ rtEnrs: rtEnrs.map((r) => r.status === 'fulfilled' && r.value) })
    dispatch({
      type: 'ROUTING_TABLE',
      routingTable: Object.fromEntries(
        rtEnrs.map((r) => (r.status === 'fulfilled' ? r.value : ['', ['', '', '', '', -1]])),
      ),
    })
  }

  async function bootUP() {
    const bootnodes = await pingBootNodes.mutateAsync({ port: rpcState.PORT, ip: rpcState.IP })
    console.log({ bootnodes })
    dispatch({
      type: 'BOOTNODES',
      bootnodes
    })
  }

  useEffect(() => {
    clearInterval('updated')
    bootUP()
    const updated = setInterval(async () => {
      await updateRT()
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
