import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableCell,
  TableBody,
  TableRow,
  Tabs,
  Tab,
  Stack,
  ListItemText,
  Button,
  FormLabel,
  Container,
} from '@mui/material'
import React from 'react'
import { ClientContext, ClientDispatchContext } from '../Contexts/ClientContext'
import { TabPanel } from './FunctionTabs'

const messageTypes = [
  'PING',
  'PONG',
  'FINDNODES',
  'NODES',
  'FINDCONTENT',
  'CONTENT',
  'OFFER',
  'ACCEPT',
  'UTP',
]

export default function PeerMessageLogs(props: { selected: string }) {
  const { selected } = props
  const state = React.useContext(ClientContext)
  const dispatch = React.useContext(ClientDispatchContext)
  const [value, setValue] = React.useState(0)
  const sentLogs = React.useMemo(() => state.SENT_LOGS[selected], [state.SENT_LOGS])
  const receivedLogs = React.useMemo(() => state.RECEIVED_LOGS[selected], [state.RECEIVED_LOGS])
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }
  function msgCellStyle(msgType: string) {
    return {}
  }
  return (
    <Container>
      <ListItemText sx={{ textAlign: 'center', border: 'solid black 1px' }} primary={selected} />
      <Stack direction={'row'}>
        <TableContainer component={Paper}>
          <Table padding="checkbox" aria-label="spanning table">
            <TableHead>
              <TableRow>
                <TableCell align="center" colSpan={1}>
                  MessageType
                </TableCell>
                <TableCell align="center" colSpan={1}>
                  SENT
                </TableCell>
                <TableCell align="center" colSpan={1}>
                  RECV
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {messageTypes.map((msgType, idx) => {
                return (
                  <TableRow key={idx}>
                    <TableCell align="center">
                      <Button onClick={() => setValue(idx + 1)}>{msgType}</Button>
                    </TableCell>
                    <TableCell align="center">
                      {(selected in state.SENT_LOGS &&
                        state.SENT_LOGS[selected][msgType]?.length) ??
                        0}
                    </TableCell>
                    <TableCell align="center">
                      {(selected in state.RECEIVED_LOGS &&
                        state.RECEIVED_LOGS[selected][msgType]?.length) ??
                        0}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {messageTypes.map((msgType, idx) => {
          return (
            <TabPanel key={idx + 1} value={value} index={idx + 1}>
              <Paper>
                <ListItemText sx={{ textAlign: 'center' }} primary={msgType} />
              </Paper>
              <Table padding="checkbox">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ textAlign: 'center' }}>SENT</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>RECV</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sentLogs &&
                    sentLogs[msgType] &&
                    Array.from({
                      length: Math.max(
                        sentLogs[msgType].length ?? 0,
                        sentLogs[msgType].length ?? 0,
                      ),
                    }).map((_, _idx) => {
                      return (
                        <TableRow key={[idx, _idx].toString()}>
                          <TableCell>{sentLogs[msgType][_idx] ?? ''}</TableCell>
                          <TableCell>
                            {(receivedLogs[msgType] && receivedLogs[msgType][_idx]) ?? ''}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </TabPanel>
          )
        })}
      </Stack>
    </Container>
  )
}
