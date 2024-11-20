import { Box, Input, Stack, Tabs, Tab, Typography, Button } from '@mui/material'
import Search from '@mui/icons-material/Search'
import React from 'react'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  }
}

function GetBlockPanel(props: { type: string; setSearchValue: any }) {
  const [hexValue, setHexValue] = React.useState('')
  const [numValue, setNumValue] = React.useState(0)
  React.useEffect(() => {
    if (hexValue.slice(2) !== numValue.toString(16)) {
      setHexValue('0x' + numValue.toString(16))
    }
  }, [numValue])
  React.useEffect(() => {
    if (hexValue.slice(2) !== numValue.toString(16)) {
      setNumValue(parseInt(hexValue, 16))
    }
    props.setSearchValue(hexValue)
  }, [hexValue])
  const setNHex = (n: string) => {
    if (!n.startsWith('0x')) {
      n = '0x' + n
    }
    try {
      BigInt(n)
      setHexValue(n)
    } catch {
      //
    }
  }
  return (
    <Stack direction="column" spacing={2}>
      {props.type === 'getBlockByNumber' && (
        <Input
          value={numValue}
          onChange={(e) => setNumValue(parseInt(e.target.value))}
          type="number"
        />
      )}
      <Input
        value={hexValue}
        onChange={(e) => setNHex(e.target.value)}
        type="text"
        placeholder={'0xabcd'}
      />
      <Button variant="contained" startIcon={<Search />}>
        Search
      </Button>
    </Stack>
  )
}

export default function GetBlockBy(props: {}) {
  const [searchVal, setSearchVal] = React.useState('')
  const [method, setMethod] = React.useState(0)
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setMethod(newValue)
  }

  return (
    <Box width={'100%'}>
      <Tabs value={method} onChange={handleChange} centered>
        <Tab {...a11yProps(0)} label="getBlockByHash" />
        <Tab {...a11yProps(1)} label="getBlockByNumber" />
        <Tab {...a11yProps(2)} label="getBlockReceipts" />
      </Tabs>
      <CustomTabPanel value={method} index={0}>
        <GetBlockPanel type={'getBlockByHash'} setSearchValue={setSearchVal} />
      </CustomTabPanel>
      <CustomTabPanel value={method} index={1}>
        <GetBlockPanel type={'getBlockByNumber'} setSearchValue={setSearchVal} />
      </CustomTabPanel>
      <CustomTabPanel value={method} index={2}>
        <GetBlockPanel type={'getBlockReceipts'} setSearchValue={setSearchVal} />
      </CustomTabPanel>
    </Box>
  )
}
