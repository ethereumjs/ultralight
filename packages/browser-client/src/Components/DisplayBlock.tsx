import { CheckCircleIcon, CopyIcon } from '@chakra-ui/icons'
import {
  Box,
  TabPanels,
  TabPanel,
  Tab,
  TabList,
  Tabs,
  Text,
  Heading,
  Grid,
  GridItem,
  Accordion,
  Link,
  Center,
  Skeleton,
  HStack,
  VStack,
} from '@chakra-ui/react'
import { HistoryNetworkContentKeyUnionType, TxReceiptWithType } from 'portalnetwork'
import SelectTx from './SelectTx'
import React, { useContext, useEffect, useState } from 'react'
import { toHexString } from './DisplayTx'
import GetHeaderProofByHash from './GetHeaderProofByHash'
import { AppContext, StateChange } from '../globalReducer'
import TxReceipt from './TxReceipt'

const DisplayBlock = () => {
  const { state, dispatch } = useContext(AppContext)
  const [validated, setValidated] = useState(false)
  const [receipts, setReceipts] = useState<TxReceiptWithType[]>([])

  useEffect(() => {
    state?.portal?.on('Verified', (key, verified) => {
      setValidated(verified)
    })
  }, [])

  const findParent = async () => {
    dispatch!({ type: StateChange.TOGGLELOADING })
    const block = await state!.historyProtocol!.ETH.getBlockByHash(
      toHexString(state!.block!.header.parentHash),
      true
    )
    if (block) {
      dispatch!({ type: StateChange.SETBLOCK, payload: block })
    }
    dispatch!({ type: StateChange.TOGGLELOADING })
  }
  function GridRow(props: any) {
    return (
      <>
        <GridItem fontSize={'xs'} fontWeight="bold" colSpan={3}>
          {props.k[0]}
        </GridItem>
        <GridItem paddingBottom={3} fontSize={'xs'} wordBreak={'break-all'} colSpan={6}>
          {props.idx === 0 ? (
            <Link color={'blue'} onClick={async () => await findParent()}>
              {props.k[1]}
            </Link>
          ) : (
            <>{props.k[1]}</>
          )}
        </GridItem>
        <GridItem colSpan={1}> </GridItem>
      </>
    )
  }
  const block = state!.block!
  const header = Object.entries(block.header.toJSON())

  async function init() {
    try {
      const receipts = await state!.historyProtocol?.receiptManager.getReceipts(block.hash())
      if (receipts) {
        setReceipts(receipts)
      }
    } catch (err) {
      console.log((err as any).message)
    }
  }

  useEffect(() => {
    if (state!.block!.transactions.length > 0) {
      init()
    }
  }, [state!.block])

  const headerlookupKey = toHexString(
    HistoryNetworkContentKeyUnionType.serialize({
      selector: 0,
      value: {
        chainId: 1,
        blockHash: block.header.hash(),
      },
    })
  )

  const bodylookupKey = toHexString(
    HistoryNetworkContentKeyUnionType.serialize({
      selector: 1,
      value: {
        chainId: 1,
        blockHash: block.header.hash(),
      },
    })
  )

  return (
    <Box>
      <Heading paddingBottom={4} size="sm" textAlign={'center'}>
        <HStack justifyContent={'center'}>
          <span>Block #</span>
          <Skeleton isLoaded={!state!.isLoading}>{Number(block.header.number)}</Skeleton>
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
            onClick={() => navigator.clipboard.writeText(headerlookupKey)}
          />
        </GridItem>
        <GridItem wordBreak={'break-all'} colSpan={10} colStart={6}>
          <Skeleton isLoaded={!state!.isLoading}>
            <Text wordBreak={'break-all'} fontSize="xs" textAlign={'start'}>
              {headerlookupKey}
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
            onClick={() => navigator.clipboard.writeText(bodylookupKey)}
          />
        </GridItem>
        <GridItem wordBreak={'break-all'} colSpan={10} colStart={6}>
          <Skeleton isLoaded={!state!.isLoading}>
            <Text wordBreak={'break-all'} fontSize="xs" textAlign={'start'}>
              {bodylookupKey}
            </Text>
          </Skeleton>
        </GridItem>
      </Grid>
      <Tabs>
        <Center>
          <TabList>
            <Tab>Header</Tab>
            <Tab>Transactions</Tab>
            <Tab>Receipts</Tab>
            <Tab>JSON</Tab>
          </TabList>
        </Center>
        <TabPanels>
          <TabPanel>
            <VStack>
              {validated || <GetHeaderProofByHash />}
              <Grid templateColumns={'repeat(10, 1fr)'}>
                {header &&
                  header.map((key, idx) => {
                    return <GridRow key={idx} k={key} idx={idx} />
                  })}
              </Grid>
            </VStack>
          </TabPanel>
          <TabPanel>{state!.block!.transactions.length > 0 && <SelectTx />}</TabPanel>
          <TabPanel>
            <Box>
              <Accordion allowToggle>
                {state!.block!.transactions.length > 0 &&
                  receipts.length > 0 &&
                  receipts.map((rec, idx) => {
                    return (
                      <TxReceipt
                        rec={rec}
                        idx={idx}
                        hash={toHexString(state!.block!.transactions[idx].hash())}
                      />
                    )
                  })}
              </Accordion>
            </Box>
          </TabPanel>
          <TabPanel>
            <Skeleton isLoaded={!state!.isLoading}>
              <Text wordBreak={'break-all'}>{JSON.stringify(block.header.toJSON())}</Text>
            </Skeleton>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}

export default DisplayBlock
