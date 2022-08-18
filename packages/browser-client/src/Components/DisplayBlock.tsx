import { CopyIcon } from '@chakra-ui/icons'
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
  Link,
  Center,
  Skeleton,
  HStack,
} from '@chakra-ui/react'
import { HistoryNetworkContentKeyUnionType } from 'portalnetwork'
import SelectTx from './SelectTx'
import React, { Dispatch, SetStateAction, useContext } from 'react'
import { BlockContext, HistoryProtocolContext } from '../ContextHooks'
import { toHexString } from './DisplayTx'

interface DisplayBlockProps {
  isLoading: boolean
  setIsLoading: Dispatch<SetStateAction<boolean>>
}

const DisplayBlock: React.FC<DisplayBlockProps> = (props: DisplayBlockProps) => {
  const history = useContext(HistoryProtocolContext)
  const { block, setBlock } = useContext(BlockContext)
  const findParent = async (blockHash: string) => {
    props.setIsLoading(true)
    const block = await history.getBlockByHash(blockHash, true)
    if (block) {
      setBlock(block)
    }
    props.setIsLoading(false)
  }
  function GridRow(props: any) {
    return (
      <>
        <GridItem fontSize={'xs'} fontWeight="bold" colSpan={3}>
          {props.k[0]}
        </GridItem>
        <GridItem paddingBottom={3} fontSize={'xs'} wordBreak={'break-all'} colSpan={6}>
          {props.idx === 0 ? (
            <Link color={'blue'} onClick={async () => await findParent(props.k[1])}>
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
  const header = Object.entries(block!.header!.toJSON())
  const txList = block.transactions
  const tx: string[] = block.transactions?.map((tx) => '0x' + tx.hash().toString('hex'))

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
          <Skeleton isLoaded={!props.isLoading}>{Number(block.header.number)}</Skeleton>
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
          <Skeleton isLoaded={!props.isLoading}>
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
          <Skeleton isLoaded={!props.isLoading}>
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
            <Tab>Uncles</Tab>
            <Tab>JSON</Tab>
          </TabList>
        </Center>
        <TabPanels>
          <TabPanel>
            <Grid templateColumns={'repeat(10, 1fr)'}>
              {header &&
                header.map((key, idx) => {
                  return <GridRow key={idx} k={key} idx={idx} />
                })}
            </Grid>
          </TabPanel>
          <TabPanel>{tx.length > 0 && <SelectTx txList={tx} tx={txList} />}</TabPanel>
          <TabPanel>Uncles</TabPanel>
          <TabPanel>
            <Skeleton isLoaded={!props.isLoading}>
              <Text wordBreak={'break-all'}>{JSON.stringify(block.header.toJSON())}</Text>
            </Skeleton>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}

export default DisplayBlock
