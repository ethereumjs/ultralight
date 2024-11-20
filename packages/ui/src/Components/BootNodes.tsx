import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'
import React from 'react'
import { CheckmarkIcon, ErrorIcon } from 'react-hot-toast'
import { ClientContext } from '../Contexts/ClientContext'

function createRow(idx: number, client: string, enr: string, nodeId: string, connected: boolean) {
  return { idx, client, enr, nodeId, connected }
}

export default function BootNodeResponses() {
  const state = React.useContext(ClientContext)
  const rows = state.BOOTNODES
    ? Object.entries(state.BOOTNODES).map(([nodeId, { idx, client, enr, connected }]) =>
        createRow(idx, client, enr, nodeId, connected),
      )
    : []
  return (
    <Container
      sx={{
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <TableContainer sx={{ maxHeight: '600' }} component={Paper}>
        <Table padding="none" stickyHeader aria-label="spanning table">
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
              <TableCell>NodeId</TableCell>
              <TableCell>Connected</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx}</TableCell>
                  <TableCell>{row.client}</TableCell>
                  <Tooltip title={row.enr}>
                    <TableCell>{row.enr.slice(0, 24)}...</TableCell>
                  </Tooltip>
                  <Tooltip title={row.nodeId}>
                    <TableCell>0x{row.nodeId.slice(0, 16)}...</TableCell>
                  </Tooltip>
                  <TableCell align="right">
                    {row.connected ? <CheckmarkIcon /> : <ErrorIcon />}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  )
}
