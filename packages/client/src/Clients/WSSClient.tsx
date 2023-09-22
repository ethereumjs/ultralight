import { Box } from '@mui/material'
import { trpc } from '../utils/trpc'
import { useEffect, useReducer, useState } from 'react'
import Client from '../Components/Client'
import {
  ClientContext,
  ClientDispatchContext,
  ClientInitialState,
  ClientProvider,
  ClientReducer,
} from '../Contexts/ClientContext'

export function WSSClient() {
  const [state, dispatch] = useReducer(ClientReducer, ClientInitialState)
  const boot = trpc.pingBootNodes.useMutation()

  const pingBootNodes = async () => {
    const res = await boot.mutateAsync()
    const bootnoderes = res.map((r) => {
      return r
        ? {
            tag: r.tag,
            enr: r.enr,
            connected: 'true',
          }
        : {
            tag: 'client0.0.1',
            enr: 'enr:xxxx....',
            connected: 'false',
          }
    })
    dispatch({
      type: 'BOOTNODES',
      bootnodeResponses: bootnoderes,
    })
    getLocalRoutingTable()
  }
  const localRoutingTable = trpc.local_routingTable.useMutation()
  trpc.onTalkReq.useSubscription(undefined, {
    onData(data) {
      console.log('onTalkReq data:', data)
    },
    onError(error) {
      console.log('onTalkReq error:', error)
    },
    onStarted() {
      console.log('onTalkReq started')
    },
  })

  const sendPing = trpc.ping.useMutation({
    onMutate(variables) {
      console.log({ variables })
    },
    onSettled(data) {
      console.log({
        data,
      })
    },
  })
  const [pong, setPong] = useState<any>()

  const ping = async (enr: string) => {
    const pong = await sendPing.mutateAsync({ enr })
    setPong(pong)
    getLocalRoutingTable()
  }

  const getLocalRoutingTable = async () => {
    const _peers = await localRoutingTable.mutateAsync()
    dispatch({
      type: 'ROUTING_TABLE',
      routingTable: _peers,
    })
  }

  // const nodeInfo = trpc.self.useQuery().data
  // dispatch({
  //   type: 'NODE_INFO',
  //   ...nodeInfo,
  // })
  
  useEffect(() => {
    getLocalRoutingTable()
    pingBootNodes()
  }, [])

  return (
    <ClientContext.Provider value={state}>
      <ClientDispatchContext.Provider value={dispatch}>
        <Box height={'100vh'} width={'100%'} style={{ wordBreak: 'break-word' }}>
          <Client ping={ping} pong={pong} name={'WebSockets Client'} />
        </Box>
      </ClientDispatchContext.Provider>
    </ClientContext.Provider>
  )
}
