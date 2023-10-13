import {
  Box,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Input,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  TextareaAutosize,
  Tooltip,
} from '@mui/material'
import SaveAs from '@mui/icons-material/SaveAs'
import React, { useEffect } from 'react'
import { trpc } from '../utils/trpc'

import { ClientContext, ClientDispatchContext } from '../Contexts/ClientContext'
import { JSONObject } from 'superjson/dist/types'

const blockHeaderContent_key =
  '0x0088e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
const blockHeaderContent_value =
  '0x080000001c020000f90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec401000080ff0700000000000000000000000000000000000000000000000000000023d6398abe4eba641e97a075b30780c12ebe18b24e83a9a9c7bdd94a910cf749bb6bb61aeab6bc5786067f7432bad790642b578881460279ad773a8191596c3087811c70634dbf2ea3abb7199cb5638713844db315d63467f40b5d38eeb884ddcb57866840a050f634417365e9515cd5e6826038ceb45659d85365cfcfceb7a6e9886aaff50b16b6af2bc3bde8b7e701b2cb5022ba49cac9d6c456834e692772b12acf7af78a8375b80ef177c9ad743a14ff0d4935f9ac105444fd57f802fed32495bab257b9585a149a7de4ac53eda7b6df7b9dac7f92325ba05eb1e6b588202048719c250620f4bfa71307470d6c835156db527294c6e6004f9de0c3595a7f1df43427c770506e7e3ca5d021f065544c6ba191d8ffc5fc0805b805d301c926c183ed9ec7e467b962e2304fa7945b6b18042dc2a53cb62b27b28af50fc06db5da2f83bd479f3719b9972fc723c69e4cd13877dcf7cc2a919a95cdf5d7805d9bd9a9f1fbf7a880d82ba9d7af9ed554ce01ea778db5d93d0665ca4fee11f4f873b0b1b58ff1337769b6ee458316030aeac65a5aab68d60fbf214bd44455f892260020000000000000000000000000000000000000000000000000000000000000'
const blockBodyContent_key = '0x0188e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
const blockBodyContent_value = '0x0800000008000000c0'

const typeFromKey = (key: string) => {
  if (key.length < 2) {
    return ''
  }
  if (key.startsWith('0x')) {
    key = key.slice(2)
  }
  if (key[0] !== '0') {
    return 'unknown'
  }
  switch (key[1]) {
    case '0':
      return 'BlockHeaderWithProof'
    case '1':
      return 'BlockBody'
    case '2':
      return 'BlockReceipts'
    case '3':
      return 'EpochAccumulator'
    default:
      return 'unknown'
  }
}

export default function ContentStore(props: any) {
  const state = React.useContext(ClientContext)
  const dispatch = React.useContext(ClientDispatchContext)
  const [contentKey, setContentKey] = React.useState<string>(
    '0x0088e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6',
  )
  const [content, setContent] = React.useState<string>(
    '0x080000001c020000f90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec401000080ff0700000000000000000000000000000000000000000000000000000023d6398abe4eba641e97a075b30780c12ebe18b24e83a9a9c7bdd94a910cf749bb6bb61aeab6bc5786067f7432bad790642b578881460279ad773a8191596c3087811c70634dbf2ea3abb7199cb5638713844db315d63467f40b5d38eeb884ddcb57866840a050f634417365e9515cd5e6826038ceb45659d85365cfcfceb7a6e9886aaff50b16b6af2bc3bde8b7e701b2cb5022ba49cac9d6c456834e692772b12acf7af78a8375b80ef177c9ad743a14ff0d4935f9ac105444fd57f802fed32495bab257b9585a149a7de4ac53eda7b6df7b9dac7f92325ba05eb1e6b588202048719c250620f4bfa71307470d6c835156db527294c6e6004f9de0c3595a7f1df43427c770506e7e3ca5d021f065544c6ba191d8ffc5fc0805b805d301c926c183ed9ec7e467b962e2304fa7945b6b18042dc2a53cb62b27b28af50fc06db5da2f83bd479f3719b9972fc723c69e4cd13877dcf7cc2a919a95cdf5d7805d9bd9a9f1fbf7a880d82ba9d7af9ed554ce01ea778db5d93d0665ca4fee11f4f873b0b1b58ff1337769b6ee458316030aeac65a5aab68d60fbf214bd44455f892260020000000000000000000000000000000000000000000000000000000000000',
  )
  const [hashKey, setHashKey] = React.useState<string>('')
  const [curType, setCurType] = React.useState<string>('')
  const [stored, setStored] = React.useState<Map<string, string>>(new Map())
  const [displayKey, setDisplayKey] = React.useState<string | undefined>('')
  const [display, setDisplay] = React.useState<JSONObject | undefined>()
  const historyStore = trpc.browser_historyStore.useMutation()
  const historyRetrieve = trpc.browser_historyLocalContent.useMutation()
  const [sortBy, setSortBy] = React.useState<{
    key: 'added' | 'key'
    asc: boolean
  }>({
    key: 'added',
    asc: true,
  })

  async function retrieve() {
    if (displayKey === '0xFakeKey') {
      return {
        header: { hash: '0x0', number: -1 },
        proof: [Uint8Array.from([0]), Uint8Array.from([0]), Uint8Array.from([0])],
      }
    }
    const res = await historyRetrieve.mutateAsync({
      contentKey: displayKey!,
    })
    console.log('retrieve', displayKey, res)
    setDisplay(JSON.parse(res))
  }

  useEffect(() => {
    displayKey ? retrieve() : setDisplay(undefined)
  }, [displayKey])

  useEffect(() => {
    if (contentKey.length < 2) {
      setCurType('')
      return
    }
    const key = contentKey.startsWith('0x') ? contentKey.slice(2) : contentKey
    setCurType(typeFromKey(key))
    if (key.length !== 66) {
      setHashKey('')
      return
    }
    try {
      const h = parseInt(key, 16)
      setHashKey(h.toString(16))
    } catch {
      setHashKey('')
    }
  }, [contentKey])

  const onClick = async () => {
    console.log('portal_historyStore', contentKey, curType)
    const key = contentKey.startsWith('0x') ? contentKey : '0x' + contentKey
    const value = content.startsWith('0x') ? content : '0x' + content
    await historyStore.mutateAsync({
      contentKey: key,
      content: value,
    })
    setDisplayKey(key)
  }

  return (
    <Stack sx={{ width: '100%', overflow: 'hidden' }} direction={'row'}>
      <Container sx={{ maxHeight: 500 }}>
        <Stack direction={'column'}>
          <List dense>
            <ListItem>
              <FormControl fullWidth>
                <FormHelperText
                  sx={{
                    width: '100%',
                    textAlign: 'center',
                    color: curType === 'unknown' ? 'red' : 'black',
                  }}
                >
                  ContentKey
                </FormHelperText>
                <TextareaAutosize
                  placeholder="contentKey"
                  value={contentKey}
                  onChange={(e) => setContentKey(e.target.value)}
                />
                <FormHelperText>Content</FormHelperText>
                <TextareaAutosize
                  maxRows={8}
                  placeholder="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </FormControl>
            </ListItem>
            <ListItem>
              <Button fullWidth endIcon={<SaveAs />} sx={{ border: 'solid black' }} onClick={onClick}>
                <ListItemText primary="STORE CONTENT" secondary={curType} />
              </Button>
            </ListItem>
            <ListItem>
              <Button
                variant="outlined"
                onClick={() => {
                  setContentKey(blockHeaderContent_key)
                  setContent(blockHeaderContent_value)
                }}
                size="small"
                fullWidth
                sx={{ fontSize: 8 }}
              >
                Sample BlockHeader
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setContentKey(blockBodyContent_key)
                  setContent(blockBodyContent_value)
                }}
                size="small"
                fullWidth
                sx={{ fontSize: 8 }}
              >
                SAMPLE BLOCKBODY
              </Button>
            </ListItem>
          </List>
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table stickyHeader padding="none">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy.key === 'key'}
                      onClick={() =>
                        setSortBy({
                          key: 'key',
                          asc: !sortBy.asc,
                        })
                      }
                      direction={sortBy.asc ? 'asc' : 'desc'}
                    >
                      Key
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>
                    <TableSortLabel
                      direction={sortBy.asc ? 'asc' : 'desc'}
                      active={sortBy.key === 'added'}
                      onClick={() =>
                        setSortBy({
                          key: 'added',
                          asc: !sortBy.asc,
                        })
                      }
                    >
                      Added
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(state.CONTENT_STORE)
                  .sort(([ka, a], [kb, b]) => {
                    if (sortBy.asc) {
                      if (sortBy.key === 'key') {
                        return ka > kb ? 1 : -1
                      }
                      return a[sortBy.key] > b[sortBy.key] ? 1 : -1
                    } else {
                      if (sortBy.key === 'key') {
                        return ka < kb ? 1 : -1
                      }
                      return a[sortBy.key] < b[sortBy.key] ? 1 : -1
                    }
                  })
                  .map(([key, value]) => {
                    return (
                      <TableRow>
                        <TableCell width={'33%'} sx={{ overflow: 'scroll' }}>
                          <Tooltip title={key}>
                            <ListItemButton onClick={() => setDisplayKey(key)}>
                              <ListItemText primary={key.slice(0, 10) + '...'} />
                            </ListItemButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell width={'33%'}>{value.type}</TableCell>
                        <TableCell width={'33%'}>{value.added}</TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Container>
      <TableContainer sx={{ maxHeight: 500 }}>
        {display && (
          <Table stickyHeader padding="checkbox">
            <TableHead>
              <TableRow>
                <TableCell colSpan={2}>
                  <ListItemText
                    primary={displayKey ? typeFromKey(displayKey) : ''}
                    secondary={displayKey}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                {Object.keys(display).map((key) => {
                  return <TableCell key={key}>{key}</TableCell>
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({
                length: Math.max(
                  ...Object.values(display).map((value) => {
                    return value ? Object.keys(value).length : 0
                  }),
                ),
              }).map((_, i) => {
                return (
                  <TableRow key={i}>
                    {Object.values(display).map((val, idx) => {
                      const data = val ? Object.entries(val)[i] : undefined
                      return (
                        <TableCell
                          onClick={() => {
                            console.log('copy', data && data[1])
                          }}
                        >
                          <Tooltip title={data ? data[1] : ''}>
                            <ListItemText
                              primary={data ? data[0] : ''}
                              secondary={data ? data[1] : ''}
                            ></ListItemText>
                          </Tooltip>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Stack>
  )
}
