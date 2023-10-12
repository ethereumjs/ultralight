import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableCell,
  TableBody,
  TableRow,
  Tooltip,
  ListItemText,
  Button,
  Tabs,
  Tab,
} from '@mui/material'
import React from 'react'
import { ClientContext, ClientDispatchContext } from '../Contexts/ClientContext'
import { TabPanel } from './FunctionTabs'
import PeerMessageLogs from './PeerMessageLogs'

export default function MessageLogs() {
  const state = React.useContext(ClientContext)
  const dispatch = React.useContext(ClientDispatchContext)
  const [currentReceivedLogs, setCurrentReceivedLogs] = React.useState<
    Record<string, Record<string, any[]>>
  >(state.RECEIVED_LOGS)
  const [currentSentLogs, setCurrentSentLogs] = React.useState<
    Record<string, Record<string, any[]>>
  >(state.SENT_LOGS)
  const [msgAlerts, setMsgAlerts] = React.useState({
    ping: false,
    pong: false,
    findNodes: false,
    nodes: false,
    findContent: false,
    content: false,
    offer: false,
    accept: false,
  })
  const [peerAlerts, setPeerAlerts] = React.useState<Record<string, boolean>>({
    '0xabcd': false,
  })
  const [selected, setSelected] = React.useState<string>('')

  const altertMsg = (type: keyof typeof msgAlerts) => {
    switch (type) {
      case 'ping':
        clearTimeout('ping')
        const ping = setTimeout(() => {
          normalizeMsg(type)
        }, 500)
        break
      case 'pong':
        clearTimeout('pong')
        const pong = setTimeout(() => {
          normalizeMsg(type)
        }, 500)
        break
      case 'findNodes':
        clearTimeout('findNodes')
        const findNodes = setTimeout(() => {
          normalizeMsg(type)
        }, 500)
        break
      case 'nodes':
        clearTimeout('nodes')
        const nodes = setTimeout(() => {
          normalizeMsg(type)
        }, 500)
        break
      case 'findContent':
        clearTimeout('findContent')
        const findContent = setTimeout(() => {
          normalizeMsg(type)
        }, 500)
        break
      case 'content':
        clearTimeout('content')
        const content = setTimeout(() => {
          normalizeMsg(type)
        }, 500)
        break
      case 'offer':
        clearTimeout('offer')
        const offer = setTimeout(() => {
          normalizeMsg(type)
        }, 500)
        break
      case 'accept':
        clearTimeout('accept')
        const accept = setTimeout(() => {
          normalizeMsg(type)
        }, 500)
        break
      default:
        return
    }
    setMsgAlerts((prev) => ({ ...prev, [type]: true }))
  }
  const normalizeMsg = (type: keyof typeof msgAlerts) => {
    setMsgAlerts((prev) => ({ ...prev, [type]: false }))
  }

  const alertPeer = (peer: keyof typeof peerAlerts) => {
    clearTimeout('peer')
    const peerTimeout = setTimeout(() => {
      normalizePeer(peer)
    }, 500)
    setPeerAlerts((prev) => ({ ...prev, [peer]: true }))
  }
  const normalizePeer = (peer: keyof typeof peerAlerts) => {
    setPeerAlerts((prev) => ({ ...prev, [peer]: false }))
  }

  const msgCellStyle = (type: keyof typeof msgAlerts) => ({
    backgroundColor: msgAlerts[type] ? 'orange' : 'white',
  })

  const peerCellStyle = (peer: keyof typeof peerAlerts) => ({
    backgroundColor: peerAlerts[peer] ? 'orange' : 'white',
  })

  React.useEffect(() => {
    for (const [peer, logs] of Object.entries(state.RECEIVED_LOGS)) {
      if (currentReceivedLogs[peer] === undefined) {
        alertPeer(peer)
      } else {
        for (const [type, msgs] of Object.entries(logs as Record<string, any[]>)) {
          const msgAlterType = type.toLowerCase() as keyof typeof msgAlerts
          if (!Object.keys(currentReceivedLogs[peer]).includes(type)) {
            if (msgs.length > 0) {
              alertPeer(peer)
              altertMsg(msgAlterType)
            }
          } else {
            if (msgs.length > currentReceivedLogs[peer][type].length) {
              alertPeer(peer)
              altertMsg(msgAlterType)
            }
          }
        }
      }
    }
    for (const [peer, logs] of Object.entries(state.SENT_LOGS)) {
      if (currentSentLogs[peer] === undefined) {
        alertPeer(peer)
      } else {
        for (const [type, msgs] of Object.entries(logs as Record<string, any[]>)) {
          const msgAlterType = type.toLowerCase() as keyof typeof msgAlerts
          if (!Object.keys(currentSentLogs[peer]).includes(type)) {
            if (msgs.length > 0) {
              alertPeer(peer)
              altertMsg(msgAlterType)
            }
          } else {
            if (msgs.length > currentSentLogs[peer][type].length) {
              alertPeer(peer)
              altertMsg(msgAlterType)
            }
          }
        }
      }
    }
    setCurrentSentLogs(state.SENT_LOGS)
    setCurrentReceivedLogs(state.RECEIVED_LOGS)
  }, [state.RECEIVED_LOGS, state.SENT_LOGS])

  React.useEffect(() => {
    const topics = [
      'PING',
      'PONG',
      'FINDNODES',
      'NODES',
      'FINDCONTENT',
      'CONTENT',
      'OFFER',
      'ACCEPT',
    ]
    const fakeLog = setInterval(() => {
      const topic = topics[Math.floor(Math.random() * topics.length)]
        dispatch({
        type: 'LOG_RECEIVED',
        topic: topic,
        nodeId: '0xFakeId',
        log: `${new Date().toLocaleTimeString()}`,
      })
    }, 10000)
  }, [])
  const [value, setValue] = React.useState(0)

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const handleSelect = (peer: string) => {
    setSelected(peer)
    setValue(1)
  }

  return (
    <Tabs
      orientation="vertical"
      variant="scrollable"
      value={value}
      onChange={handleChange}
      aria-label="message logs"
      sx={{ borderRight: 1, borderColor: 'divider' }}
    >
      <Tab label={value === 0 ? '' : 'BACK'}></Tab>
      <Tab label={value === 0 ? ' ' : selected}></Tab>
      <TabPanel index={0} value={value}>
        <TableContainer component={Paper}>
          <Table size="small" aria-label="spanning table">
            <TableHead>
              <TableCell align="center" colSpan={4}>
                Peer
              </TableCell>
              <TableCell style={msgCellStyle('ping')} align="center">
                Ping
              </TableCell>
              <TableCell style={msgCellStyle('pong')} align="center">
                Pong
              </TableCell>
              <TableCell style={msgCellStyle('findNodes')} align="center">
                FindNodes
              </TableCell>
              <TableCell style={msgCellStyle('nodes')} align="center">
                Nodes
              </TableCell>
              <TableCell style={msgCellStyle('findContent')} align="center">
                FindContent
              </TableCell>
              <TableCell style={msgCellStyle('content')} align="center">
                Content
              </TableCell>
              <TableCell style={msgCellStyle('offer')} align="center">
                Offer
              </TableCell>
              <TableCell style={msgCellStyle('accept')} align="center">
                Accept
              </TableCell>
              <TableCell style={msgCellStyle('accept')} align="center">
                uTP
              </TableCell>
            </TableHead>
            <TableBody>
              {Object.entries(state.RECEIVED_LOGS).map(([peer, logs]: any) => {
                const sentLogs = (state.SENT_LOGS as any)[peer] ?? {}
                return (
                  <>
                    <TableRow>
                      <TableCell rowSpan={2} style={peerCellStyle(peer)} colSpan={2}>
                        <Tooltip title={peer}>
                          <ListItemText>
                            {peer.slice(0, 6)}...{peer.slice(-4)}
                          </ListItemText>
                        </Tooltip>
                      </TableCell>
                      <TableCell rowSpan={2} style={peerCellStyle(peer)} colSpan={2}>
                        <Button onClick={() => handleSelect(peer)}>DETAILS</Button>
                      </TableCell>
                      <TableCell style={{ color: 'blue' }} align="center">
                        SENT
                      </TableCell>
                      <TableCell style={{ color: 'blue', fontWeight: 'bold' }} align="center">
                        {sentLogs['PING'] ? sentLogs['PING'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'blue', fontWeight: 'bold' }} align="center">
                        {sentLogs['PONG'] ? sentLogs['PONG'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'blue', fontWeight: 'bold' }} align="center">
                        {sentLogs['FINDNODES'] ? sentLogs['FINDNODES'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'blue', fontWeight: 'bold' }} align="center">
                        {sentLogs['NODES'] ? sentLogs['NODES'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'blue', fontWeight: 'bold' }} align="center">
                        {sentLogs['FINDCONTENT'] ? sentLogs['FINDCONTENT'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'blue', fontWeight: 'bold' }} align="center">
                        {sentLogs['CONTENT'] ? sentLogs['CONTENT'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'blue', fontWeight: 'bold' }} align="center">
                        {sentLogs['OFFER'] ? sentLogs['OFFER'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'blue', fontWeight: 'bold' }} align="center">
                        {sentLogs['ACCEPT'] ? sentLogs['ACCEPT'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'blue', fontWeight: 'bold' }} align="center">
                        {sentLogs['UTP'] ? sentLogs['UTP'].length : 0}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ color: 'green' }} align="center">
                        RECV
                      </TableCell>
                      <TableCell style={{ color: 'green', fontWeight: 'bold' }} align="center">
                        {logs['PING'] ? logs['PING'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'green', fontWeight: 'bold' }} align="center">
                        {logs['PONG'] ? logs['PONG'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'green', fontWeight: 'bold' }} align="center">
                        {logs['FINDNODES'] ? logs['FINDNODES'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'green', fontWeight: 'bold' }} align="center">
                        {logs['NODES'] ? logs['NODES'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'green', fontWeight: 'bold' }} align="center">
                        {logs['FINDCONTENT'] ? logs['FINDCONTENT'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'green', fontWeight: 'bold' }} align="center">
                        {logs['CONTENT'] ? logs['CONTENT'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'green', fontWeight: 'bold' }} align="center">
                        {logs['OFFER'] ? logs['OFFER'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'green', fontWeight: 'bold' }} align="center">
                        {logs['ACCEPT'] ? logs['ACCEPT'].length : 0}
                      </TableCell>
                      <TableCell style={{ color: 'green', fontWeight: 'bold' }} align="center">
                        {logs['UTP'] ? logs['UTP'].length : 0}
                      </TableCell>
                    </TableRow>
                  </>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
      <TabPanel index={1} value={value}>
        <PeerMessageLogs selected={selected} />
      </TabPanel>
    </Tabs>
  )
}
