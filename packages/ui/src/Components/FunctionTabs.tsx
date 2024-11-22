import { Button, LinearProgress, Stack } from '@mui/material'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import * as React from 'react'
import { ClientContext, ClientDispatchContext } from '../Contexts/ClientContext'
import { RPCContext, RPCDispatchContext } from '../Contexts/RPCContext'
import BootNodeResponses from './BootNodes'
import ContentStore from './ContentStore'
import MessageLogs from './MessageLogs'
import NodeInfo from './NodeInfo'
import Ping from './Ping'
import RPC from './RPC'
import GetBeacon from './getChainTip'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

export function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      style={{ width: '100%' }}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </Box>
  )
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`,
  }
}

export default function FunctionTabs() {
  const state = React.useContext(ClientContext)
  const { REQUEST, PORT, IP } = React.useContext(RPCContext)
  const dispatch = React.useContext(ClientDispatchContext)
  const rpcDispatch = React.useContext(RPCDispatchContext)
  const [value, setValue] = React.useState(0)
  const [bootup, setBootup] = React.useState<boolean | undefined>(true)

  const pingBooTnodes = REQUEST.pingBootNodes.useMutation()

  const handleChange = (_: any, newValue: number) => {
    setValue(newValue)
  }

  const bootNodes = async () => {
    setBootup(undefined)
    setTimeout(() => {
      setBootup(false)
    }, 10000)
    const res =
      state.CONNECTION === 'http'
        ? await pingBooTnodes.mutateAsync({
            port: PORT,
            ip: IP,
          })
        : await pingBooTnodes.mutateAsync({})
    res &&
      dispatch({
        type: 'BOOTNODES',
        bootnodes: res,
      })
    setBootup(false)
  }

  return (
    <Box sx={{ bgcolor: 'background.paper', width: '100%' }}>
      {bootup === true ? (
        <Button variant="contained" fullWidth onClick={() => bootNodes()}>
          CONNECT TO BOOTNODES
        </Button>
      ) : bootup === undefined ? (
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
      ) : (
        <></>
      )}
      <Stack width={'100%'} direction="row" spacing={2}>
        <Tabs
          orientation="vertical"
          variant="fullWidth"
          value={value}
          onChange={handleChange}
          aria-label="Client Tabs"
          sx={{ borderRight: 1, borderColor: 'divider' }}
        >
          <Tab label={`Peers (${Object.keys(state.ROUTING_TABLE).length})`} {...a11yProps(0)} />
          <Tab label="BootNodes" {...a11yProps(1)} />
          <Tab label="PingPong" {...a11yProps(2)} />
          <Tab label="StateRoot" {...a11yProps(3)} />
          <Tab disabled={state.CONNECTION === 'http'} label="PeerLogs" {...a11yProps(4)} />
          <Tab label="Store Content" {...a11yProps(5)} />
          <Tab label="RPC Interface" {...a11yProps(6)} />
        </Tabs>
        <TabPanel value={value} index={0}>
          <NodeInfo />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <BootNodeResponses />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <Ping />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <GetBeacon />
        </TabPanel>
        <TabPanel value={value} index={4}>
          <MessageLogs />
        </TabPanel>
        <TabPanel value={value} index={5}>
          <ContentStore />
        </TabPanel>
        <TabPanel value={value} index={6}>
          <RPC />
        </TabPanel>
      </Stack>
    </Box>
  )
}
