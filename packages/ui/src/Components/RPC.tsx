import {
  Button,
  Container,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
} from '@mui/material'
import React from 'react'
import RPCInput from './RPCInput'
import RPCParams from './RPCParams'
import { RPCContext, RPCDispatchContext, TMethods, WSMethods } from '../Contexts/RPCContext'
import { ClientContext } from '../Contexts/ClientContext'
import { trpc } from '../utils/trpc'

export const methodNames = [
  'discv5_nodeInfo',
  'portal_historyRoutingTableInfo',
  'portal_historyPing',
  'portal_historyFindNodes',
  'portal_historyFindContent',
  'portal_historyRecursiveFindContent',
  'portal_historyOffer',
  'portal_historySendOffer',
  'portal_historyGossip',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
] as const

export type RPCMethod = (typeof methodNames)[number]

export default function RPC() {
  const rpcState = React.useContext(RPCContext)
  const rpcDispatch = React.useContext(RPCDispatchContext)
  const [meta, setMeta] = React.useState<any>({})
  const [method, setMethod] = React.useState<RPCMethod>('discv5_nodeInfo')
  const rpcMethods: Record<keyof TMethods, any> = {
    pingBootNodes: trpc.pingBootNodes.useMutation(),
    discv5_nodeInfo: trpc.browser_nodeInfo.useMutation(),
    portal_historyPing: rpcState.REQUEST.portal_historyPing.useMutation(),
    portal_historyRoutingTableInfo: rpcState.REQUEST.portal_historyRoutingTableInfo.useMutation(),
    portal_historyFindNodes: rpcState.REQUEST.portal_historyFindNodes.useMutation(),
    portal_historyFindContent: rpcState.REQUEST.portal_historyFindContent.useMutation(),
    portal_historyRecursiveFindContent:
      rpcState.REQUEST.portal_historyRecursiveFindContent.useMutation(),
    portal_historyOffer: rpcState.REQUEST.portal_historyOffer.useMutation(),
    portal_historySendOffer: rpcState.REQUEST.portal_historySendOffer.useMutation(),
    portal_historyGossip: rpcState.REQUEST.portal_historyGossip.useMutation(),
    eth_getBlockByHash: rpcState.REQUEST.eth_getBlockByHash.useMutation(),
    eth_getBlockByNumber: rpcState.REQUEST.eth_getBlockByNumber.useMutation(),
  }
  function handleChangeMethod(event: SelectChangeEvent<string>) {
    setMethod(event.target.value as RPCMethod)
  }

  async function handleClick() {
    rpcDispatch({
      type: 'CURRENT_RESPONSE',
      response: '',
    })
    const req = request()
    console.log(`method: ${method}`)
    console.log(`params: ${JSON.stringify(req.params)}`)
    rpcDispatch({
      type: 'CURRENT_REQUEST',
      request: JSON.stringify({
        method: req.type,
        params: req.params,
      }),
    })
    const res = await req.response
    console.log(`response: ${JSON.stringify(res)}`)
    rpcDispatch({
      type: 'CURRENT_RESPONSE',
      response: typeof res === 'string' ? res : JSON.stringify(res),
    })
  }

  function request() {
    console.log(`Preparing request for ${method}`)

    switch (method) {
      case 'discv5_nodeInfo': {
        const res = rpcMethods.discv5_nodeInfo.mutateAsync({})
        return {
          type: 'discv5_nodeInfo',
          params: {},
          response: res,
        }
      }
      case 'portal_historyPing': {
        const params = {
          enr: rpcState.ENR,
        }
        const res = rpcMethods.portal_historyPing.mutateAsync(params)
        return {
          type: 'portal_historyPing',
          params,
          response: res,
        }
      }
      case 'portal_historyRoutingTableInfo': {
        const res = rpcMethods.portal_historyRoutingTableInfo.mutateAsync()
        return {
          type: 'portal_historyRoutingTableInfo',
          params: [],
          response: res,
        }
      }
      case 'portal_historyFindNodes': {
        const params = {
          nodeId: rpcState.NODEID,
          distances: rpcState.DISTANCES,
        }
        const res = rpcMethods.portal_historyFindNodes.mutateAsync(params)
        return {
          type: 'portal_historyFindNodes',
          params,
          response: res,
        }
      }
      case 'portal_historyFindContent': {
        const params = {
          nodeId: rpcState.NODEID,
          contentKey: rpcState.CONTENT_KEY,
        }
        const res = rpcMethods.portal_historyFindContent.mutateAsync(params)
        return {
          type: 'portal_historyFindContent',
          params,
          response: res,
        }
      }
      case 'portal_historyRecursiveFindContent': {
        const params = {
          contentKey: rpcState.CONTENT_KEY,
        }
        const res = rpcMethods.portal_historyRecursiveFindContent.mutateAsync(params)
        return {
          type: 'portal_historyRecursiveFindContent',
          params,
          response: res,
        }
      }
      case 'portal_historyOffer': {
        const params = {
          nodeId: rpcState.NODEID,
          contentKey: rpcState.CONTENT_KEY,
          content: rpcState.CONTENT,
        }
        const res = rpcMethods.portal_historyOffer.mutateAsync(params)
        return {
          type: 'portal_historyOffer',
          params,
          response: res,
        }
      }
      case 'portal_historySendOffer': {
        const params = {
          nodeId: rpcState.NODEID,
          contentKeys: rpcState.CONTENT_KEY_ARRAY,
        }
        const res = rpcMethods.portal_historySendOffer.mutateAsync(params)
        return {
          type: 'portal_historySendOffer',
          params,
          response: res,
        }
      }
      case 'portal_historyGossip': {
        const params = {
          contentKey: rpcState.CONTENT_KEY,
          content: rpcState.CONTENT,
        }
        const res = rpcMethods.portal_historyGossip.mutateAsync(params)
        return {
          type: 'portal_historyGossip',
          params,
          response: res,
        }
      }
      default:
        return {
          type: 'UNKNOWN',
          params: [],
          response: async () => {},
        }
    }
  }

  return (
    <Container>
      <Stack direction="row" spacing={2}>
        <Paper sx={{ border: 'solid black 2px' }}>
          <List>
            <ListItem>
              <Stack direction="row" spacing={2}>
                <ListItemText primary={'RPC'} />
                <Button onClick={handleClick} variant="contained">
                  Send
                </Button>
              </Stack>
            </ListItem>
            <ListItem>
              <FormControl fullWidth>
                <InputLabel id="rpc-method-select-menu">Method</InputLabel>
                <Select
                  labelId="rpc-method-select-menu-label"
                  id="rpc-method-menu"
                  value={method}
                  label="Method"
                  autoWidth
                  onChange={handleChangeMethod}
                >
                  <MenuItem value={'discv5_nodeInfo'}>discv5_nodeInfo</MenuItem>
                  <MenuItem value={'portal_historyRoutingTableInfo'}>
                    portal_historyRoutingTableInfo
                  </MenuItem>
                  <MenuItem value={'portal_historyPing'}>portal_historyPing</MenuItem>
                  <MenuItem value={'portal_historyFindNodes'}>portal_historyFindNodes</MenuItem>
                  <MenuItem value={'portal_historyFindContent'}>portal_historyFindContent</MenuItem>
                  <MenuItem value={'portal_historyRecursiveFindContent'}>
                    portal_historyRecursiveFindContent
                  </MenuItem>
                  <MenuItem value={'portal_historyOffer'}>portal_historyOffer</MenuItem>
                  <MenuItem value={'portal_historySendOffer'}>portal_historySendOffer</MenuItem>
                  <MenuItem value={'portal_historyGossip'}>portal_historyGossip</MenuItem>
                  <MenuItem value={'eth_getBlockByHash'}>eth_getBlockByHash</MenuItem>
                  <MenuItem value={'eth_getBlockByNumber'}>eth_getBlockByNumber</MenuItem>
                </Select>
              </FormControl>
            </ListItem>
            <ListItem>
              <RPCInput method={method as RPCMethod} />
            </ListItem>
            <ListItem>
              <Paper>
                {/* {meta?.description} */}
              </Paper>
            </ListItem>
            <ListItem>
              <RPCParams method={method as RPCMethod} />
            </ListItem>
          </List>
        </Paper>
        <Container>
          <Paper sx={{ border: 'solid black 2px' }}>
            <ListSubheader>Request:</ListSubheader>
            {rpcState.CURRENT_LOG.request}
          </Paper>
          <Paper sx={{ border: 'solid black 2px' }}>
            <ListSubheader>Response:</ListSubheader>
            {rpcState.CURRENT_LOG.response}
          </Paper>
        </Container>
      </Stack>
    </Container>
  )
}
