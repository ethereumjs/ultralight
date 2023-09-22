import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import LookupContent from './LookupContent'
import GetBlockBy from './getBlockBy'
import GetBeacon from './getChainTip'
import Ping from './Ping'
import NodeInfo from './NodeInfo'
import BootNodeResponses from './BootNodes'
import { ClientContext } from '../Contexts/ClientContext'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`,
  }
}

export default function FunctionTabs(props: { ping: any; pong: any }) {
  const state = React.useContext(ClientContext)
  const { ping, pong } = props
  const [value, setValue] = React.useState(0)
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex' }}>
      <Tabs
        orientation="vertical"
        variant="scrollable"
        value={value}
        onChange={handleChange}
        aria-label="Vertical tabs example"
        sx={{ borderRight: 1, borderColor: 'divider' }}
      >
        <Tab label={`Peers (${Object.keys(state.ROUTING_TABLE).length})`} {...a11yProps(0)} />
        <Tab label="BootNodes" {...a11yProps(1)} />
        <Tab label="PingPong" {...a11yProps(2)} />
        <Tab label="StateRoot" {...a11yProps(3)} />
        <Tab label="GetBlockBy" {...a11yProps(4)} />
        <Tab label="ContentLookup" {...a11yProps(5)} />
        <Tab label="Node Info" {...a11yProps(6)} />
      </Tabs>
      <TabPanel value={value} index={0}>
        <NodeInfo />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <BootNodeResponses />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Ping ping={ping} pong={pong} />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <GetBeacon />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <GetBlockBy />
      </TabPanel>
      <TabPanel value={value} index={5}>
        <LookupContent />
      </TabPanel>
      <TabPanel value={value} index={6}>
      </TabPanel>
    </Box>
  )
}
