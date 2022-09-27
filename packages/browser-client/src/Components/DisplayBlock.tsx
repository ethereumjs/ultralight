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
  fromHexString,
  HistoryNetworkContentKeyUnionType,
  toHexString,
  TxReceiptWithType,
} from 'portalnetwork'
import React, { useContext, useEffect, useState } from 'react'
import { AppContext, AppContextType, StateChange } from '../globalReducer'
import GetHeaderProofByHash from './GetHeaderProofByHash'
import SelectTx from './SelectTx'

const DisplayBlock = () => {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const [validated, setValidated] = useState(false)
  const [_receipts, setReceipts] = useState<TxReceiptWithType[]>([])
  const [contentKeys, setContentKeys] = useState({ header: '', body: '' })
  const [hovered, setHovered] = useState<string | null>(null)

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
      <GridItem
        onMouseEnter={() => setHovered(k)}
        onMouseLeave={() => setHovered(null)}
        colSpan={10}
      >
        <Box bg={k === hovered ? 'yellow.300' : idx % 2 === 0 ? 'gray.100' : 'gray.200'}>
          <Grid templateColumns={'repeat(10, 1fr)'}>
            <>
              <GridItem fontSize={'xs'} fontWeight="bold" colSpan={3}>
                {k}
              </GridItem>
              <GridItem paddingBottom={0} fontSize={'xs'} wordBreak={'break-all'} colSpan={6}>
                {k === 'parentHash' ? (
                  <GridItem paddingBottom={0} fontSize={'xs'} wordBreak={'break-all'} colSpan={6}>
                    <Link color={'blue'} onClick={async () => await findParent()}>
                      {typeof v === 'number' ? v.toString(16) : toHexString(v)}
                    </Link>
                  </GridItem>
                ) : k === 'transactions' ? (
                  <>
                    <GridItem paddingBottom={0} fontSize={'xs'} wordBreak={'break-all'} colSpan={6}>
                      {v ? v.length : '[NONE]'}
                    </GridItem>{' '}
                  </>
                ) : typeof v === 'bigint' ? (
                  <>
                    <GridItem paddingBottom={3} fontSize={'xs'} wordBreak={'break-all'} colSpan={6}>
                      <Grid templateColumns={'repeat(6, 1fr)'}>
                        <GridItem
                          paddingBottom={3}
                          fontSize={'xs'}
                          wordBreak={'break-all'}
                          colSpan={3}
                        >
                          {`${v.toString()}`}
                        </GridItem>
                        <GridItem colSpan={3}>{'0x' + v.toString(16)}</GridItem>
                      </Grid>
                    </GridItem>
                  </>
                ) : k === 'nonce' ? (
                  <>
                    <GridItem paddingBottom={3} fontSize={'xs'} wordBreak={'break-all'} colSpan={6}>
                      <Grid templateColumns={'repeat(6, 1fr)'}>
                        <GridItem
                          paddingBottom={3}
                          fontSize={'xs'}
                          wordBreak={'break-all'}
                          colSpan={3}
                        >
                          {parseInt(toHexString(Uint8Array.from(v)), 16)}
                        </GridItem>
                        <GridItem colSpan={3}>{toHexString(Uint8Array.from(v))}</GridItem>
                      </Grid>
                    </GridItem>
                  </>
                ) : k === 'extraData' ? (
                  <>
                    <GridItem paddingBottom={3} fontSize={'xs'} wordBreak={'break-all'} colSpan={6}>
                      <Grid templateColumns={'repeat(6, 1fr)'}>
                        <GridItem colSpan={3}>{Buffer.from(fromHexString(v)).toString()}</GridItem>
                        <GridItem
                          paddingBottom={3}
                          fontSize={'xs'}
                          wordBreak={'break-all'}
                          colSpan={3}
                        >
                          {v}
                        </GridItem>
                      </Grid>
                    </GridItem>
                  </>
                ) : k === 'gasUsed' ? (
                  <>
                    {(state.block as any).header ? (
                      <GridItem
                        paddingBottom={3}
                        fontSize={'xs'}
                        wordBreak={'break-all'}
                        colSpan={6}
                      >
                        <Grid templateColumns={'repeat(6, 1fr)'}>
                          <GridItem
                            paddingBottom={3}
                            fontSize={'xs'}
                            wordBreak={'break-all'}
                            colSpan={3}
                          >
                            {v}
                          </GridItem>
                          <GridItem colSpan={3}>
                            {'0x' + (state.block as any).header.gasUsed.toString(16)}
                          </GridItem>
                        </Grid>
                      </GridItem>
                    ) : (
                      <GridItem
                        paddingBottom={3}
                        fontSize={'xs'}
                        wordBreak={'break-all'}
                        colSpan={6}
                      >
                        <Grid templateColumns={'repeat(6, 1fr)'}>
                          <GridItem
                            paddingBottom={3}
                            fontSize={'xs'}
                            wordBreak={'break-all'}
                            colSpan={3}
                          >
                            {`${v.toString()}`}
                          </GridItem>
                          <GridItem colSpan={3}>{'0x' + v.toString(16)}</GridItem>
                        </Grid>
                      </GridItem>
                    )}
                  </>
                ) : (
                  <GridItem paddingBottom={3} fontSize={'xs'} wordBreak={'break-all'} colSpan={6}>
                    <>
                      {typeof v === 'string'
                        ? v
                        : typeof v === 'number'
                        ? v.toString(16)
                        : typeof v === 'object'
                        ? toHexString(Uint8Array.from(v as number[]))
                        : typeof v}
                    </>
                  </GridItem>
                )}
              </GridItem>
            </>
          </Grid>
        </Box>
      </GridItem>
    )
  }
  function BlockHeader() {
    if ((state.block as any).header) {
      const header = (state.block as any).header
      return (
        <Grid templateColumns={'repeat(10, 1fr)'}>
          {' '}
          {typeof (state.block as any).hash === 'function' && (
            <>
              <GridItem bg={'gray.100'} fontSize={'xs'} fontWeight="bold" colSpan={3}>
                hash{' '}
              </GridItem>
              <GridItem bg={'gray.100'} colSpan={7} fontSize={'xs'}>
                0x{(state.block as any).hash().toString('hex')}
              </GridItem>
            </>
          )}
          {Object.entries(header).map(([key, value], idx) => {
            const v =
              key === 'parentHash'
                ? Buffer.from(Uint8Array.from(value as number[]))
                : key === 'difficulty'
                ? (value as bigint)
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
                  ? (value as any as BigNumber)._hex
                  : value === undefined
                  ? 'Undefineded for unknown reasons'
                  : typeof value
                : key === 'coinbase'
                ? toHexString((value as any).buf as Buffer)
                : typeof value === 'string'
                ? value
                : typeof value === 'object'
                ? Object.values(value!)
                : typeof value === 'bigint'
                ? value
                : typeof value
            return key === 'cache' ? (
              <Box key={key}></Box>
            ) : (
              <GridRow key={key} k={key} v={v} idx={idx} />
            )
          })}
        </Grid>
      )
    } else {
      const header = state.block as _Block
      return (
        <Grid templateColumns={'repeat(10, 1fr)'}>
          {Object.entries(header).map(([key, value], idx) => {
            const v =
              typeof value === 'object'
                ? value._hex
                : key === 'nonce'
                ? BigInt(parseInt(value, 16))
                : value
            return <GridRow key={key} k={key} v={v} idx={idx} />
          })}
        </Grid>
      )
    }
  }
  // const block = state.block!
  // const header = (block: Block | BlockWithTransactions) => {
  //   Object.entries(block)
  //     .map((entry) => {
  //       let val
  //       switch (typeof entry[1]) {
  //         case 'string':
  //           val = entry[1]
  //           break
  //         case 'object':
  //           val = entry[1].toString()
  //           break
  //         case 'number':
  //           val = entry[1].toString()
  //           break
  //       }
  //       return [entry[0], val]
  //     })
  //     .filter((entry) => entry[0].slice(0, 1) !== '_')
  // }
  async function init(hash: string) {
    try {
      const receipts = await state.provider!.historyProtocol?.receiptManager.getReceipts(
        Buffer.from(hash.slice(2), 'hex')
      )
      if (receipts) {
        setReceipts(receipts)
      }
    } catch (err) {
      console.log((err as any).message)
    }
    try {
      setContentKeys({
        header: toHexString(
          HistoryNetworkContentKeyUnionType.serialize({
            selector: 0,
            value: {
              chainId: 1,
              blockHash: fromHexString(state.block!.hash),
            },
          })
        ),
        body: toHexString(
          HistoryNetworkContentKeyUnionType.serialize({
            selector: 1,
            value: {
              chainId: 1,
              blockHash: fromHexString(state.block!.hash),
            },
          })
        ),
      })
    } catch {}
  }

  useEffect(() => {
    if (state.block) {
      if (typeof state.block.hash === 'string') {
        init(state.block.hash)
      } else if (typeof (state.block as any).header.hash === 'string') {
        init((state.block as any).header.hash)
      }
    }
  }, [state.block])

  return (
    <Box>
      {state.block && (
        <>
          <Heading paddingBottom={4} size="sm" textAlign={'center'}>
            <HStack justifyContent={'center'}>
              <span>Block #</span>
              <Skeleton isLoaded={!state.isLoading}>
                {(state.block as any).header
                  ? (state.block as any).header.number.toString()
                  : state.block.number}
              </Skeleton>
              {validated && <CheckCircleIcon />}
            </HStack>
          </Heading>
          <Grid templateColumns={'repeat(16, 1fr'} columnGap={1}>
            <GridItem colSpan={4}>
              <Text fontSize="xs" textAlign={'start'}>
                <span style={{ fontWeight: 'bold' }}>Header Key: </span>
              </Text>
            </GridItem>
            <GridItem colStart={5} colSpan={1}>
              <CopyIcon
                marginEnd={2}
                cursor="pointer"
                onClick={() => navigator.clipboard.writeText(contentKeys.header)}
              />
            </GridItem>
            <GridItem wordBreak={'break-all'} colSpan={10} colStart={6}>
              <Skeleton isLoaded={!state.isLoading}>
                <Text wordBreak={'break-all'} fontSize="xs" textAlign={'start'}>
                  {contentKeys.header}
                </Text>
              </Skeleton>
            </GridItem>
            <GridItem colSpan={4}>
              <Text fontSize="xs" textAlign={'start'}>
                <span style={{ fontWeight: 'bold' }}>Body Key: </span>
              </Text>
            </GridItem>
            <GridItem colStart={5} colSpan={1}>
              <CopyIcon
                marginEnd={2}
                cursor="pointer"
                onClick={() => navigator.clipboard.writeText(contentKeys.body)}
              />
            </GridItem>
            <GridItem wordBreak={'break-all'} colSpan={10} colStart={6}>
              <Skeleton isLoaded={!state.isLoading}>
                <Text wordBreak={'break-all'} fontSize="xs" textAlign={'start'}>
                  {contentKeys.body}
                </Text>
              </Skeleton>
            </GridItem>
          </Grid>
          <Tabs>
            <Center>
              <TabList>
                <Tab>Header</Tab>
                <Tab>Transactions</Tab>
                <Tab>JSON</Tab>
              </TabList>
            </Center>
            <TabPanels>
              <TabPanel>
                <VStack>
                  {validated || <GetHeaderProofByHash />}
                  <BlockHeader />
                </VStack>
              </TabPanel>
              <TabPanel>
                {(state.block as any).transactions &&
                (state.block as any).transactions.length > 0 ? (
                  <SelectTx />
                ) : (
                  <Heading>This Block contains no transactions</Heading>
                )}
              </TabPanel>
              <TabPanel>
                <Skeleton isLoaded={!state.isLoading}>
                  <Text wordBreak={'break-all'}>{JSON.stringify(state.block)}</Text>
                </Skeleton>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </>
      )}
    </Box>
  )
}

export default DisplayBlock
