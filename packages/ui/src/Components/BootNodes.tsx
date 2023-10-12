import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { CheckmarkIcon, ErrorIcon } from 'react-hot-toast'
import { ClientContext } from '../Contexts/ClientContext'
import React from 'react'

function createRow(tag: string, enr: string, nodeId: string, multiAddr: string, bucket: number) {
  return { tag, enr, nodeId, multiAddr, bucket }
}

export default function BootNodeResponses() {
  const state = React.useContext(ClientContext)
  const rows = Object.values(state.BOOTNODES).map(({ tag, enr, connected }) =>
    createRow(tag, enr, connected === undefined ? '' : connected, '', 0),
  )
  return (
    <TableContainer sx={{ maxHeight: '20vh', overflow: 'scroll' }} component={Paper}>
      <Table size="small" aria-label="spanning table">
        <TableHead>
          <TableRow>
            <TableCell align="center" colSpan={3}>
              BootNode Responses
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>ENR</TableCell>
            <TableCell align="right">Ping</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              <TableCell>{idx}</TableCell>
              <TableCell>{row.tag}</TableCell>
              <TableCell>{row.enr}</TableCell>
              <TableCell align="right">
                {row.nodeId === 'true' ? <CheckmarkIcon /> : <ErrorIcon />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
