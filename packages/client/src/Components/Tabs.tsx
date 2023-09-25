import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { WSSClient } from '../Clients/WSSClient'
import HTTPClient from '../Clients/HTTPClient'
import { trpc } from '../utils/trpc'
import {
  AllClientsContext,
  AllClientsDispatchContext,
  AllClientsInitialState,
  AllClientsReducer,
} from '../Contexts/AllClientsContext'

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

export default function ClientTabs() {
  const [clients, dispatch] = React.useReducer(AllClientsReducer, AllClientsInitialState)

  const [value, setValue] = React.useState(0)
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }
  const wssClient = trpc.self.useMutation()
  const getWSSClient = async () => {
    const wssClientInfo = await wssClient.mutateAsync()
    dispatch({
      type: 'WSS_INFO',
      ...wssClientInfo,
    })
  }
  

  const httpClient = trpc.discv5_nodeInfo.useMutation()
  const getNodeInfo = async (port: number = 8545) => {
    const nodeInfo = await httpClient.mutateAsync({ port })
    dispatch({
      type: 'HTTP_INFO',
      port,
      ...nodeInfo,
    })
  }
  React.useEffect(() => {
    getWSSClient()
    getNodeInfo()
  }, [])

  return (
    <AllClientsContext.Provider value={clients}>
      <AllClientsDispatchContext.Provider value={dispatch}>
        <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', height: 224 }}>
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={value}
            onChange={handleChange}
            aria-label="Vertical tabs example"
            sx={{ borderRight: 1, borderColor: 'divider' }}
          >
            <Tab label="WSS Client" {...a11yProps(0)} />
            <Tab label="HTTP Client" {...a11yProps(1)} />
            <Tab label="Tests" {...a11yProps(2)} />
          </Tabs>
          <TabPanel value={value} index={0}>
            <WSSClient />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <HTTPClient />
          </TabPanel>
          <TabPanel value={value} index={2}>
            <Box>TESTS</Box>
          </TabPanel>
          <TabPanel value={value} index={3}>
            Item Four
          </TabPanel>
          <TabPanel value={value} index={4}>
            Item Five
          </TabPanel>
          <TabPanel value={value} index={5}>
            Item Six
          </TabPanel>
          <TabPanel value={value} index={6}>
            Item Seven
          </TabPanel>
        </Box>
      </AllClientsDispatchContext.Provider>
    </AllClientsContext.Provider>
  )
}
