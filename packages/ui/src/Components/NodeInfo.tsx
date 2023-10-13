import * as React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { Box } from '@mui/material'
import { ClientContext, ClientDispatchContext } from '../Contexts/ClientContext'
import { RPCContext, RPCDispatchContext } from '../Contexts/RPCContext'

function createRow(tag: string, enr: string, nodeId: string, multiAddr: string, bucket: number) {
  return { tag, enr, nodeId, multiAddr, bucket }
}

export function SelfNodeInfo() {
  const state = React.useContext(ClientContext)
  const dispatch = React.useContext(ClientDispatchContext)
  const rpc = React.useContext(RPCContext)
  const rpcDispatch = React.useContext(RPCDispatchContext)
  const { tag, enr, nodeId, multiAddr } = state.NODE_INFO

  const row = createRow(tag, enr, nodeId, multiAddr, 0)
  const nodeInfo = rpc.REQUEST.discv5_nodeInfo.useMutation()
  const getNodeInfo = async () => {
    const info = state.CONNECTION === 'http'
      ? await nodeInfo.mutateAsync({ port: rpc.PORT })
      : await nodeInfo.mutateAsync({})
    dispatch({
      type: 'NODE_INFO',
      ...info,
    })
  }
  React.useEffect(() => {
    getNodeInfo()
  }, [])
  React.useEffect(() => {
    getNodeInfo()
  }, [rpc.PORT, rpc.IP])
  return (
    <TableContainer sx={{ width: '100%' }} component={Paper}>
      <Table sx={{ width: '100%' }} size="small" aria-label="self node info">
        <TableHead>
          <TableRow>
            <TableCell>{row.tag}</TableCell>
            <TableCell>{row.enr}</TableCell>
            <TableCell align="right">{row.nodeId}</TableCell>
            <TableCell align="right">{row.multiAddr}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody></TableBody>
      </Table>
    </TableContainer>
  )
}
export default function NodeInfo() {
  const state = React.useContext(ClientContext)
  const rt = Object.values(state.ROUTING_TABLE) as [string, string, string, string, number][]
  const rows = rt.map(([tag, enr, nodeId, multiAddr, bucket]) =>
    createRow(tag, enr, nodeId, multiAddr, bucket),
  )
  return (
    <Box overflow="hidden">
      <TableContainer sx={{ maxHeight: 500 }} component={Paper}>
        <Table stickyHeader size="small" aria-label="node info">
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>ENR</TableCell>
              <TableCell>NodeId</TableCell>
              <TableCell>MultiAddr</TableCell>
              <TableCell>Dist</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.tag}</TableCell>
                <TableCell>{row.enr.slice(0, 16)}...</TableCell>
                <TableCell align="right">{row.nodeId.slice(0, 12)}...</TableCell>
                <TableCell align="right">{row.multiAddr}</TableCell>
                <TableCell align="right">{row.bucket}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
