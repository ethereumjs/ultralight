import {
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { RPCMethod } from './RPC'
import React from 'react'
import { RPCContext } from '../Contexts/RPCContext'
import { decodeTxt } from '../utils/enr'
import { bytesToHex, bytesToUtf8 } from '@ethereumjs/util'

export default function RPCParams(props: { method: RPCMethod }) {
  const state = React.useContext(RPCContext)

  const EnrDetails = () => {
    try {
      const values = decodeTxt(state.ENR)
      return (
        <Stack direction={'row'}>
          <Paper sx={{ width: '50%', overflow: 'hidden' }}></Paper>
          <List sx={{ maxWidth: '50%' }} dense>
            <ListSubheader>ENR Details</ListSubheader>
            <ListItemText primary={'client tag'} secondary={bytesToUtf8(values.kvs.c)} />
            <ListItemText
              primary={'ip'}
              secondary={values.kvs.ip.toString().replaceAll(',', '.')}
            />
            <ListItemText primary={'udp'} secondary={parseInt(bytesToHex(values.kvs.udp))} />
            <ListItemText primary={'id'} secondary={bytesToHex(values.kvs.id)} />
            <ListItemText primary={'signature'} secondary={values.signature} />
            <ListItemText primary={'seq'} secondary={values.seq} />
            <ListItemText primary={'secp256k1'} secondary={bytesToHex(values.kvs.secp256k1)} />
          </List>
        </Stack>
      )
    } catch {
      return <></>
    }
  }

  const params = (method: RPCMethod) => {
    switch (method) {
      case 'discv5_nodeInfo': {
        return {
          none: [],
        }
      }
      case 'portal_historyRoutingTableInfo': {
        return {
          none: [],
        }
      }
      case 'portal_historyPing': {
        return {
          enr: state.ENR,
        }
      }
      case 'portal_historyFindNodes': {
        return {
          nodeId: state.NODEID,
          distances: state.DISTANCES,
        }
      }
      case 'portal_historyFindContent': {
        return {
          nodeId: state.NODEID,
          contentKey: state.CONTENT_KEY,
        }
      }
      case 'portal_historyRecursiveFindContent': {
        return {
          contentKey: state.CONTENT_KEY,
        }
      }
      case 'portal_historyOffer': {
        return {
          nodeId: state.NODEID,
          contentKey: state.CONTENT_KEY,
          content: state.CONTENT,
        }
      }
      case 'portal_historySendOffer': {
        return {
          nodeId: state.NODEID,
          contentKeyArray: state.CONTENT_KEY_ARRAY,
        }
      }
      case 'portal_historyGossip': {
        return {
          contentKey: state.CONTENT_KEY,
          content: state.CONTENT,
        }
      }
      case 'eth_getBlockByHash': {
        return {
          blockHash: state.BLOCK_HASH,
        }
      }
      case 'eth_getBlockByNumber': {
        return {
          blockNumber: state.BLOCK_NUMBER,
        }
      }
      default:
        return {}
    }
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader padding="checkbox">
          <TableHead>
            <TableRow>
              <TableCell colSpan={2}>
                <ListItemText
                  primary={props.method}
                  secondary={`params: [${Object.keys(params(props.method)).toString()}]`}
                />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(params(props.method)).map(([key, entry]) => {
              let val = typeof entry === 'string' ? entry : JSON.stringify(entry)
              if (val.length === 0) {
                val = `<set ${key}>`
              }
              return (
                <TableRow>
                  <TableCell>{key}</TableCell>
                  <TableCell>{val}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {'enr' in params(props.method) && <EnrDetails />}
    </Paper>
  )
}
