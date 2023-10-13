import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import GetBeacon from './getChainTip'
import Ping from './Ping'
import NodeInfo from './NodeInfo'
import BootNodeResponses from './BootNodes'
import { ClientContext } from '../Contexts/ClientContext'
import {
  Stack,
} from '@mui/material'
import ContentStore from './ContentStore'
import MessageLogs from './MessageLogs'
import RPC from './RPC'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

export function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      style={{ width: '100%' }}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
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
  const [value, setValue] = React.useState(0)

  const handleChange = (_: any, newValue: number) => {
    setValue(newValue)
  }

  return (
    <Box sx={{ bgcolor: 'background.paper', width:"100%" }}>
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
          <Tab label="PeerLogs" {...a11yProps(4)} />
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
        <TabPanel value={value} index={6 }>
          <RPC />
        </TabPanel>
      </Stack>
    </Box>
  )
}
