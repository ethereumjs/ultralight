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
import { Container } from '@mui/material'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <Container
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      sx={{ padding: 0, width: '100%', margin: 0 }}
      {...other}
    >
      {value === index && <Box sx={{ padding: 0, margin: 0, width: '100%' }}>{children}</Box>}
    </Container>
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

  const [value, setValue] = React.useState(1)
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }
  
  return (
    <AllClientsContext.Provider value={clients}>
      <AllClientsDispatchContext.Provider value={dispatch}>
        <Box
          id="App Tab Box"
          sx={{ bgcolor: 'background.paper', width: '100%' }}
        >
          <Tabs
            variant="fullWidth"
            value={value}
            onChange={handleChange}
            aria-label="App Tabs"
            sx={{ borderRight: 1, borderColor: 'divider' }}
          >
            <Tab disabled label="WSS Client" {...a11yProps(0)} />
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
        </Box>
      </AllClientsDispatchContext.Provider>
    </AllClientsContext.Provider>
  )
}
