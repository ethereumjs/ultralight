import {
  Button,
  FormControl,
  InputLabel,
  List,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
} from '@mui/material'
import React from 'react'
import RPCInput from './RPCInput'
import RPCParams from './RPCParams'

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
  const [method, setMethod] = React.useState<RPCMethod>('discv5_nodeInfo')

  function handleChangeMethod(event: SelectChangeEvent<string>) {
    setMethod(event.target.value as RPCMethod)
  }
  return (
    <Paper>
      <List>
        <Stack direction="row" spacing={2}>
          <ListItemText primary={'RPC'} />
          <Button variant="contained">Send</Button>
        </Stack>
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
        <RPCInput method={method as RPCMethod} />
        <RPCParams method={method as RPCMethod} />
      </List>
    </Paper>
  )
}
