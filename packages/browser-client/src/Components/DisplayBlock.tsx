import { CheckCircleIcon, CopyIcon } from '@chakra-ui/icons'
import {
  Box,
  Center,
  Grid,
  GridItem,
  Heading,
  HStack,
  Link,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import { BigNumber } from 'ethers'
import { _Block } from '@ethersproject/abstract-provider'
import {
  ExtendedEthersBlockWithTransactions,
  fromHexString,
  getHistoryNetworkContentKey,
  HistoryNetworkContentTypes,
  toHexString,
  TxReceiptWithType,
} from 'portalnetwork'
import React, { useContext, useEffect, useState } from 'react'
import { AppContext, AppContextType, StateChange } from '../globalReducer'
import GetHeaderProofByHash from './GetHeaderProofByHash'
import SelectTx from './SelectTx'

const DisplayBlock = () => {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const [keys, setKeys] = useState({ header: '', body: '' })
  const [validated, setValidated] = useState(false)
  const [_receipts, setReceipts] = useState<TxReceiptWithType[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const [tabIndex, setTabIndex] = useState(0)
  useEffect(() => {
    state.provider!.portal.on('Verified', (key, verified) => {
      setValidated(verified)
    })
  }, [])

  const findParent = async () => {
    dispatch({ type: StateChange.TOGGLELOADING })
    const block = await state.provider!.getBlockWithTransactions(state.block!.parentHash)
    if (block) {
      dispatch({ type: StateChange.SETBLOCK, payload: block })
    }
    dispatch({ type: StateChange.TOGGLELOADING })
  }
  interface IGridRow {
    k: string
    v: any
    idx: number
  }

  function GridRow(props: IGridRow) {
    const { k, v, idx } = props
    let _v: any[] = ['']
    if (typeof v === 'object') {
      _v = Object.values(v).map((val) => {
        typeof val === 'string' ? val : typeof val
      })
    }
    return (
      v && (
        <Box
          onMouseEnter={() => setHovered(k)}
          onMouseLeave={() => setHovered(null)}
          width="100%"
          height={k === 'json' ? '30%' : k === 'logsBloom' ? '22%' : '4%'}
          paddingY="0"
          marginY={0}
          textAlign={'start'}
          bg={k === hovered ? 'yellow.300' : idx % 2 === 0 ? 'gray.100' : 'gray.200'}
        >
          <HStack width="100%" marginY={0} paddingY={0} height="100%">
            <Box height="100%" width="18%" marginY={0} fontSize={'x-small'} fontWeight="bold">
              {k}
            </Box>
            <Box fontSize={'x-small'} width="82%" height="100%">
              {k === 'parentHash' ? (
                <Link fontSize={'x-small'} color={'blue'} onClick={async () => await findParent()}>
                  {v}
                </Link>
              ) : k === 'logsBloom' ? (
                <Text height="100%" overflowX="scroll">
                  {v}
                </Text>
              ) : typeof v === 'bigint' ? (
                <HStack width="100%">
                  <Box paddingY={0} wordBreak={'break-all'} width="50%">
                    {`${v.toString()}`}
                  </Box>
                  <Box paddingY={0}>{'0x' + v.toString(16)}</Box>
                </HStack>
              ) : k === 'extraData' ? (
                <HStack width="100%">
                  <Text paddingY={0} fontSize={'x-small'} width="50%">
                    {Buffer.from(fromHexString(v)).toString()}
                  </Text>
                  <Text paddingY={0} fontSize={'x-small'}>
                    {v}
                  </Text>
                </HStack>
              ) : k === 'gasUsed' ? (
                <HStack width="100%">
                  <Box paddingY={0} fontSize={'x-small'} wordBreak={'break-all'} width="50%">
                    {v}
                  </Box>
                  <Box marginY={0} paddingBottom={0} fontSize={'x-small'} wordBreak={'break-all'}>
                    {((100 * Number(v)) / Number(state.block!.gasLimit)).toString().slice(0, 4)}%
                  </Box>
                </HStack>
              ) : k === 'json' ? (
                <Text
                  paddingBottom={1}
                  marginY={0}
                  fontSize={'x-small'}
                  wordBreak={'break-all'}
                  height="90%"
                  overflowY="scroll"
                >
                  {v}
                </Text>
              ) : (
                <Text padding={0} margin={0} fontSize={'x-small'} wordBreak={'break-all'}>
                  {typeof v === 'string' ? v : typeof v === 'number' ? v : typeof v}
                </Text>
              )}
            </Box>
          </HStack>
        </Box>
      )
    )
  }
  function BlockHeader() {
    if ((state.block as any).header) {
      const header = (state.block as any).header
      return (
        <VStack width="100%" height="100%" fontSize="x-small">
          {typeof (state.block as any).hash === 'function' && (
            <GridRow
              key={'hash'}
              k={'hash'}
              v={`0x${(state.block as any).hash().toString('hex')}`}
              idx={0}
            />
          )}
          <Box width="100%" height="96%">
            {Object.entries(header)
              .filter(([_key, _value]) => _key !== '_common')
              .map(([key, value], idx) => {
                const v =
                  key === 'difficulty'
                    ? (value as bigint)
                    : key === 'parentHash'
                    ? toHexString(Uint8Array.from(Object.values(value as any)))
                    : key === 'logsBloom'
                    ? toHexString(Uint8Array.from(Object.values(value as any)))
                    : key === '_common'
                    ? 'common'
                    : key === 'extraData'
                    ? typeof value === 'string'
                      ? value
                      : toHexString(Uint8Array.from(value as number[]))
                    : key === 'gasUsed'
                    ? `${parseInt(header.gasUsed)} (${(
                        (parseInt(header.gasUsed, 16) / parseInt(header.gasLimit as any, 16)) *
                        100
                      )
                        .toString()
                        .slice(0, 4)}%)`
                    : key === 'baseFeePerGas'
                    ? value === null
                      ? 'null'
                      : value && (value as any as BigNumber)._hex === 'string'
                      ? value !== undefined && (value as any as BigNumber)._hex
                      : value === undefined
                      ? 'Undefineded for unknown reasons'
                      : typeof value
                    : key === 'coinbase'
                    ? toHexString((value as any).buf as Buffer)
                    : typeof value === 'string'
                    ? value
                    : typeof value === 'bigint'
                    ? value
                    : key === 'nonce'
                    ? BigInt('0x' + (value as Buffer).toString('hex'))
                    : '0x' + (value as any).toString('hex')
                return key === 'cache' ? (
                  <Box key={key}></Box>
                ) : (
                  <GridRow key={key} k={key} v={v} idx={idx} />
                )
              })}
          </Box>
          <GridRow idx={16} key={'json'} k={'json'} v={JSON.stringify(state.block)} />
        </VStack>
      )
    } else {
      const header = state.block!
      return (
        <VStack height="100%">
          {Object.entries(header).map(([key, value], idx) => {
            const v =
              typeof value === 'object'
                ? value !== null && value._hex
                : key === 'nonce'
                ? BigInt(parseInt(value, 16))
                : value
            return <GridRow key={key} k={key} v={v} idx={idx} />
          })}
          <GridRow idx={16} key={'json'} k={'json'} v={JSON.stringify(state.block)} />
        </VStack>
      )
    }
  }
  async function init() {
    try {
      const receipts = await state.provider!.historyProtocol.receiptManager.getReceipts(
        state.block!.hash
      )
      if (receipts) {
        setReceipts(receipts)
      }
    } catch (err) {
      console.log('Receipts Error: ', (err as any).message)
    }
  }

  useEffect(() => {
    if (state!.block!.transactions.length > 0) {
      init()
    }
    const hash =
      typeof (state.block as any).hash === 'string'
        ? (state.block as any).hash
        : toHexString((state.block as any).hash())
    const header = getHistoryNetworkContentKey(
      HistoryNetworkContentTypes.BlockHeader,
      Buffer.from(fromHexString(hash))
    )

    const body = getHistoryNetworkContentKey(
      HistoryNetworkContentTypes.BlockBody,
      Buffer.from(fromHexString(hash))
    )
    setKeys({
      header,
      body,
    })
  }, [state!.block])

  return (
    <Box width="100%" height="100%" bg="gray.300">
      {state.block && (
        <VStack height="100%" boxShadow={'outline'}>
          <Box width="100%" height="5%">
            <HStack justifyContent={'center'}>
              <Text>Block #</Text>
              <Skeleton isLoaded={!state.isLoading}>
                {state.block.number ?? (state.block as any).header.number.toString()}
              </Skeleton>
              {validated && <CheckCircleIcon />}
            </HStack>
            {
              <Text fontSize={'x-small'}>
                hash:
                {typeof (state.block as any).hash === 'string'
                  ? (state.block as any).hash
                  : toHexString((state.block as any).hash())}
              </Text>
            }
          </Box>
          <VStack width="100%" height="5%">
            <HStack width="100%">
              <Text fontWeight={'bold'} fontSize="x-small" textAlign={'start'}>
                Header Key:
              </Text>
              <CopyIcon
                marginEnd={2}
                cursor="pointer"
                onClick={() => navigator.clipboard.writeText(keys.header)}
              />
              <Skeleton isLoaded={!state.isLoading}>
                <Text wordBreak={'break-all'} fontSize="x-small" textAlign={'start'}>
                  {keys.header}
                </Text>
              </Skeleton>
            </HStack>
            <HStack width="100%">
              <Text fontSize="x-small" textAlign={'start'}>
                <span style={{ fontWeight: 'bold' }}>Body Key: </span>
              </Text>
              <CopyIcon
                marginEnd={2}
                cursor="pointer"
                onClick={() => navigator.clipboard.writeText(keys.body)}
              />
              <Skeleton isLoaded={!state.isLoading}>
                <Text wordBreak={'break-all'} fontSize="x-small" textAlign={'start'}>
                  {keys.body}
                </Text>
              </Skeleton>
            </HStack>
          </VStack>
          <Box width="100%" height="90%">
            <Tabs
              height="100%"
              onChange={(index) => setTabIndex(index)}
              bg="gray.200"
              padding={0}
              width="100%"
            >
              <TabList height="5%">
                <Tab bg={tabIndex === 0 ? 'gray.100' : 'gray.200'}>Header</Tab>
                <Tab bg={tabIndex === 1 ? 'gray.100' : 'gray.200'}>Transactions</Tab>
              </TabList>
              <TabPanels height="95%" overflow="hidden" padding={0} width="100%">
                <TabPanel padding={0} height="100%" width="100%">
                  <BlockHeader />
                </TabPanel>
                <TabPanel padding={0}>
                  {state.block.transactions && state.block.transactions.length > 0 ? (
                    <>
                      {(state.block as ExtendedEthersBlockWithTransactions).transactions[0].hash ? (
                        <SelectTx />
                      ) : (
                        <Heading>Missing Block Body</Heading>
                      )}
                    </>
                  ) : (
                    <Heading>This Block contains no transactions</Heading>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </VStack>
      )}
    </Box>
  )
}

export default DisplayBlock
