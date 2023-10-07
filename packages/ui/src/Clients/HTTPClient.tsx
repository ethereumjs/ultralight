import { Box, Stack } from '@mui/material'
import { trpc } from '../utils/trpc'
import { useEffect, useReducer, useState } from 'react'
import Client from '../Components/Client'
import {
  ClientContext,
  ClientDispatchContext,
  ClientInitialState,
  ClientReducer,
} from '../Contexts/ClientContext'

export default function HTTPClient() {
  const [state, dispatch] = useReducer(ClientReducer, ClientInitialState)

  const routingTable = trpc.portal_historyRoutingTableInfo.useMutation({
    onMutate(variables) {
      console.log('routingtable mutate:', { variables })
    },
    onSettled(data, error, variables, context) {
      console.log('routingtable settled:', {
        data,
        error,
        variables,
        context,
      })
    },
  })
  const nodeInfo = trpc.discv5_nodeInfo.useMutation({
    onMutate(variables) {
      console.log('nodeinfo mutate:', { variables })
    },
    onSettled(data, error, variables, context) {
      console.log('nodeinfo settled:', {
        data,
        error,
        variables,
        context,
      })
    },
    onError(error, variables, context) {
      console.log('nodeinfo error:', {
        error,
        variables,
        context,
      })
    },
  })
  const getNodeInfo = async (port: number = 8545) => {
    const info = await nodeInfo.mutateAsync({ port })
    dispatch({
      type: 'NODE_INFO',
      ...info,
    })
  }
  const sendPing = trpc.portal_historyPing.useMutation({
    onMutate(variables) {
      // A mutation is about to happen!
      // You can do something here like show a loading indicator
      // onMutate returns a context object that will be passed to the other methods
      console.log({ variables })
    },
    onSettled(data, error, variables, context) {
      console.log({
        data,
        error,
        variables,
        context,
      })
    },
  })
  const [pong, setPong] = useState<any>()

  const ping = async (enr: string) => {
    const pong = await sendPing.mutateAsync({ enr })
    setPong(pong)
    getRoutingTable()
  }

  const getRoutingTable = async () => {
    const table = await routingTable.mutateAsync()
    const allBucketsEntries = [...table.routingTable.reverse().entries()]
    const buckets = allBucketsEntries.filter(([_, bucket]) => bucket.length > 0)
    const p = buckets
      .map(([idx, bucket]) => {
        return bucket.map((peer: string) => {
          return ['', '', '0x' + peer, '', idx]
        })
      })
      .flat(1)
    const r = Object.fromEntries(p.entries())
    dispatch({ type: 'ROUTING_TABLE', routingTable: r })
  }

  const bootHTTP = trpc.pingBootNodeHTTP.useMutation({
    onMutate(variables) {
      console.log('bootnode mutate:', { variables })
    },
    onSettled(data, error, variables, context) {
      console.log('bootnode settled:', {
        data,
        error,
        variables,
        context,
      })
    },
    onError(error, variables, context) {
      console.log('bootnode error:', {
        error,
        variables,
        context,
      })
    },
  })
  const pingBootNodesHTTP = async () => {
    const res = await bootHTTP.mutateAsync()
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
    getRoutingTable()
  }
  
  useEffect(() => {
    getNodeInfo()
    pingBootNodesHTTP()
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
