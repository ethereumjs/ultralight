import {
  Box,
  TextField,
  FormControl,
  RadioGroup,
  FormControlLabel,
  SelectChangeEvent,
  Radio,
  Button,
  Stack,
  MenuItem,
  Select,
  List,
  ListItem,
} from '@mui/material'
import Search from '@mui/icons-material/Search'
import React from 'react'

export default function LookupContent() {
  const [contentKey, setContentKey] = React.useState<string>()
  const [network, setNetwork] = React.useState('History')
  const [contentType, setContentType] = React.useState<
    'BlockHeader' | 'BlockBody' | 'BlockReceipts' | 'EpochAccumulator'
  >('BlockHeader')
  const [contentHash, setContentHash] = React.useState<string>()
  const handleClick = async () => {
    if (contentHash && contentHash.length === 66) {
      setContentKey(prefix[contentType] + contentHash.slice(2))
    }
  }

  const setNHex = (n: string) => {
    if (!n.startsWith('0x')) {
      n = '0x' + n
    }
    try {
      BigInt(n)
      setContentKey(n)
    } catch {
      //
    }
  }
  const setHash = (n: string) => {
    if (!n.startsWith('0x')) {
      n = '0x' + n
    }
    try {
      BigInt(n)
      setContentHash(n)
    } catch {
      //
    }
  }

  const handleChangeNetwork = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNetwork(event.target.value)
  }

  const handleChangeContentType = (event: SelectChangeEvent) => {
    setContentType(
      event.target.value as 'BlockHeader' | 'BlockBody' | 'BlockReceipts' | 'EpochAccumulator',
    )
  }

  const contentTypes = ['BlockHeader', 'BlockBody', 'BlockReceipts', 'EpochAccumulator']
  const inputType = {
    BlockHeader: 'BlockHash',
    BlockBody: 'BlockHash',
    BlockReceipts: 'BlockHash',
    EpochAccumulator: 'EpochHash',
  }
  const prefix = {
    BlockHeader: '0x00',
    BlockBody: '0x01',
    BlockReceipts: '0x02',
    EpochAccumulator: '0x03',
  }

  return (
    <List>
      <ListItem>
        <Box>
          <Stack direction="column">
            <FormControl>
              <RadioGroup
                row
                aria-labelledby="network"
                name="select-network"
                value={network}
                onChange={handleChangeNetwork}
              >
                <FormControlLabel
                  labelPlacement="bottom"
                  value="History"
                  control={<Radio />}
                  label="History"
                />
                <FormControlLabel
                  labelPlacement="bottom"
                  value="BeaconLight"
                  control={<Radio />}
                  label="BeaconLight"
                />
              </RadioGroup>
            </FormControl>
            <TextField
              value={contentKey}
              onChange={(e) => setNHex(e.target.value)}
              type="text"
              placeholder={'0xabcd...'}
            />
            <Button variant="contained" startIcon={<Search />}>
              Search
            </Button>
          </Stack>
        </Box>
      </ListItem>
      <ListItem>
        <Stack direction="column">
          <TextField
            value={contentKey}
            onChange={(e) => setHash(e.target.value)}
            type="text"
            placeholder={inputType[contentType]}
          />
          <Button onClick={handleClick} variant="contained" startIcon={<Search />}>
            Get Content Key
          </Button>
          <FormControl>
            <Select
              id="selectType"
              value={contentType}
              label="Content Types"
              onChange={handleChangeContentType}
            >
              {contentTypes.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </ListItem>
    </List>
  )
}
