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
} from '@mui/material'
import React from 'react'
import { ClientContext, ClientDispatchContext } from '../Contexts/ClientContext'
import { TabPanel } from './FunctionTabs'
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
    <Stack direction={'row'}>
      <TableContainer component={Paper}>
        <Table size="small" aria-label="spanning table">
          <TableHead>
            <TableCell align="center" colSpan={1}>
              MessageType
            </TableCell>
            <TableCell align="center" colSpan={1}>
              SENT
            </TableCell>
            <TableCell align="center" colSpan={1}>
              RECV
            </TableCell>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell style={msgCellStyle('ping')} align="center">
                <Button onClick={() => setValue(1)}>PING</Button>
              </TableCell>
              <TableCell style={msgCellStyle('ping')} align="center">
                {(selected in state.SENT_LOGS && state.SENT_LOGS[selected]['PING']?.length) ?? 0}
              </TableCell>
              <TableCell style={msgCellStyle('ping')} align="center">
                {(selected in state.RECEIVED_LOGS &&
                  state.RECEIVED_LOGS[selected]['PING']?.length) ??
                  0}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={msgCellStyle('pong')} align="center">
                <Button onClick={() => setValue(2)}>PONG</Button>
              </TableCell>
              <TableCell style={msgCellStyle('pong')} align="center">
                {(selected in state.SENT_LOGS && state.SENT_LOGS[selected]['PONG']?.length) ?? 0}
              </TableCell>
              <TableCell style={msgCellStyle('pong')} align="center">
                {(selected in state.RECEIVED_LOGS &&
                  state.RECEIVED_LOGS[selected]['PONG']?.length) ??
                  0}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={msgCellStyle('findNodes')} align="center">
                <Button onClick={() => setValue(3)}>FINDNODES</Button>
              </TableCell>
              <TableCell style={msgCellStyle('findNodes')} align="center">
                {(selected in state.SENT_LOGS && state.SENT_LOGS[selected]['FINDNODES']?.length) ??
                  0}
              </TableCell>
              <TableCell style={msgCellStyle('findNodes')} align="center">
                {(selected in state.RECEIVED_LOGS &&
                  state.RECEIVED_LOGS[selected]['FINDNODES']?.length) ??
                  0}
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell style={msgCellStyle('nodes')} align="center">
                <Button onClick={() => setValue(4)}>NODES</Button>
              </TableCell>
              <TableCell style={msgCellStyle('nodes')} align="center">
                {(selected in state.SENT_LOGS && state.SENT_LOGS[selected]['NODES']?.length) ?? 0}
              </TableCell>
              <TableCell style={msgCellStyle('nodes')} align="center">
                {(selected in state.RECEIVED_LOGS &&
                  state.RECEIVED_LOGS[selected]['NODES']?.length) ??
                  0}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={msgCellStyle('findContent')} align="center">
                <Button onClick={() => setValue(5)}>FINDCONTENT</Button>
              </TableCell>
              <TableCell style={msgCellStyle('findContent')} align="center">
                {(selected in state.SENT_LOGS &&
                  state.SENT_LOGS[selected]['FINDCONTENT']?.length) ??
                  0}
              </TableCell>
              <TableCell style={msgCellStyle('findContent')} align="center">
                {(selected in state.RECEIVED_LOGS &&
                  state.RECEIVED_LOGS[selected]['FINDCONTENT']?.length) ??
                  0}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={msgCellStyle('content')} align="center">
                <Button onClick={() => setValue(6)}>CONTENT</Button>
              </TableCell>
              <TableCell style={msgCellStyle('content')} align="center">
                {(selected in state.SENT_LOGS && state.SENT_LOGS[selected]['CONTENT']?.length) ?? 0}
              </TableCell>
              <TableCell style={msgCellStyle('content')} align="center">
                {(selected in state.RECEIVED_LOGS &&
                  state.RECEIVED_LOGS[selected]['CONTENT']?.length) ??
                  0}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={msgCellStyle('offer')} align="center">
                <Button onClick={() => setValue(7)}>OFFER</Button>
              </TableCell>
              <TableCell style={msgCellStyle('offer')} align="center">
                {(selected in state.SENT_LOGS && state.SENT_LOGS[selected]['OFFER']?.length) ?? 0}
              </TableCell>
              <TableCell style={msgCellStyle('offer')} align="center">
                {(selected in state.RECEIVED_LOGS &&
                  state.RECEIVED_LOGS[selected]['OFFER']?.length) ??
                  0}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={msgCellStyle('accept')} align="center">
                <Button onClick={() => setValue(8)}>ACCEPT</Button>
              </TableCell>
              <TableCell style={msgCellStyle('accept')} align="center">
                {(selected in state.SENT_LOGS && state.SENT_LOGS[selected]['ACCEPT']?.length) ?? 0}
              </TableCell>
              <TableCell style={msgCellStyle('accept')} align="center">
                {(selected in state.RECEIVED_LOGS &&
                  state.RECEIVED_LOGS[selected]['ACCEPT']?.length) ??
                  0}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="center">
                <Button onClick={() => setValue(9)}>UTP</Button>
              </TableCell>
              <TableCell align="center">
                {(selected in state.SENT_LOGS && state.SENT_LOGS[selected]['UTP']?.length) ?? 0}
              </TableCell>
              <TableCell align="center">
                {(selected in state.RECEIVED_LOGS &&
                  state.RECEIVED_LOGS[selected]['UTP']?.length) ??
                  0}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {/* <Tabs
        orientation="vertical"
        variant="scrollable"
        value={value}
        onChange={handleChange}
        aria-label="message logs"
        sx={{ borderRight: 1, borderColor: 'divider' }}
      >
        <Tab label="Back"></Tab>
        <Tab label="PING"></Tab>
        <Tab label="PONG"></Tab>
        <Tab label="FINDNODES"></Tab>
        <Tab label="NODES"></Tab>
        <Tab label="FINDCONTENT"></Tab>
        <Tab label="CONTENT"></Tab>
        <Tab label="OFFER"></Tab>
        <Tab label="ACCEPT"></Tab>
        <Tab label="UTP"></Tab>
        <Tab label="TALKREQ"></Tab>
        <Tab label="TALKRESP"></Tab>
      </Tabs> */}
      <TabPanel value={value} index={0}>
        <Paper>
            <ListItemText primary=" " />
        </Paper>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Paper>
          <ListItemText primary="PING" />
        </Paper>
        <Table padding='checkbox'>
          <TableHead>
            <TableRow>
              <TableCell>SENT</TableCell>
              <TableCell>RECV</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({
              length: Math.max(sentLogs?.PING?.length ?? 0, receivedLogs?.PING?.length ?? 0),
            }).map((_, idx) => {
              return (
                <TableRow key={idx}>
                  <TableCell>{sentLogs?.PING?.[idx] ?? ''}</TableCell>
                  <TableCell>{receivedLogs?.PING?.[idx] ?? ''}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TabPanel>
      <TabPanel value={value} index={2}>
        PONG
      </TabPanel>
      <TabPanel value={value} index={3}>
        FINDNODES
      </TabPanel>
      <TabPanel value={value} index={4}>
        NODES
      </TabPanel>
      <TabPanel value={value} index={5}>
        FINDCONTENT
      </TabPanel>
      <TabPanel value={value} index={6}>
        CONTENT
      </TabPanel>
      <TabPanel value={value} index={7}>
        OFFER
      </TabPanel>
      <TabPanel value={value} index={8}>
        ACCEPT
      </TabPanel>
      <TabPanel value={value} index={9}>
        UTP
      </TabPanel>
      <TabPanel value={value} index={10}>
        TALKREQ
      </TabPanel>
      <TabPanel value={value} index={11}>
        TALKRESP
      </TabPanel>
    </Stack>
  )
}
