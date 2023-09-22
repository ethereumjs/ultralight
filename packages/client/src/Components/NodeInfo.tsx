import * as React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { Box } from '@mui/material'
import { ClientContext } from '../Contexts/ClientContext'

function createRow(tag: string, enr: string, nodeId: string, multiAddr: string, bucket: number) {
  return { tag, enr, nodeId, multiAddr, bucket }
}

export function SelfNodeInfo() {
  const state = React.useContext(ClientContext)
  const { tag, enr, nodeId, multiAddr } = state.NODE_INFO
  const row = createRow(tag, enr, nodeId, multiAddr, 0)
  return (
    <TableContainer component={Paper}>
      <Table size="small" aria-label="spanning table">
        <TableHead>
          <TableRow>
            <TableCell>{row.tag}</TableCell>
            <TableCell>{row.enr.slice(0, 16)}...</TableCell>
            <TableCell align="right">{row.nodeId.slice(0, 12)}...</TableCell>
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
    <Box overflow="scroll">
      <TableContainer component={Paper}>
        <Table size="small" aria-label="spanning table">
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
