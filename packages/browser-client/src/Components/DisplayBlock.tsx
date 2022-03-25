import { CopyIcon, SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  TabPanels,
  TabPanel,
  Tab,
  TabList,
  Tabs,
  Text,
  Heading,
  Button,
  Grid,
  GridItem,
} from '@chakra-ui/react'
import { Block } from '@ethereumjs/block'
import { getHistoryNetworkContentId } from 'portalnetwork'
import SelectTx from './SelectTx'

interface DisplayBlockProps {
  block: Block
  findParent: (hash: string) => Promise<void>
}

export default function DisplayBlock(props: DisplayBlockProps) {
  const header = Object.entries(props.block!.header!.toJSON())
  const txList = props.block.transactions
  const tx: string[] = props.block.transactions.map((tx) => '0x' + tx.hash().toString('hex'))
  const headerlookupKey = getHistoryNetworkContentId(1, props.block.toJSON().header?.mixHash!, 0)
  const bodylookupKey = getHistoryNetworkContentId(1, props.block.toJSON().header?.mixHash!, 1)
  return (
    <Box>
      <Heading paddingBottom={4} size="sm" textAlign={'center'}>
        Block #{props.block.header.number.toNumber()}
      </Heading>
      <Grid templateColumns={'repeat(16, 1fr'} columnGap={1}>
        <GridItem colSpan={4}>
          <Text fontSize="xs" textAlign={'start'}>
            <span style={{ fontWeight: 'bold' }}>Header Key: </span>
          </Text>
        </GridItem>
        <GridItem colStart={5} colSpan={1}>
          <CopyIcon marginEnd={2} />
        </GridItem>
        <GridItem wordBreak={'break-all'} colSpan={10} colStart={6}>
          <Text wordBreak={'break-all'} fontSize="xs" textAlign={'start'}>
            {headerlookupKey}
          </Text>
        </GridItem>
        <GridItem colSpan={4}>
          <Text fontSize="xs" textAlign={'start'}>
            <span style={{ fontWeight: 'bold' }}>Body Key: </span>
          </Text>
        </GridItem>
        <GridItem colStart={5} colSpan={1}>
          <CopyIcon marginEnd={2} />
        </GridItem>
        <GridItem wordBreak={'break-all'} colSpan={10} colStart={6}>
          <Text wordBreak={'break-all'} fontSize="xs" textAlign={'start'}>
            {bodylookupKey}
          </Text>
        </GridItem>
      </Grid>
      <Tabs>
        <TabList>
          <Tab>Header</Tab>
          <Tab>Transactions</Tab>
          <Tab>Uncles</Tab>
          <Tab>JSON</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Grid templateColumns={'repeat(10, 1fr)'}>
              {header &&
                header.map((key, idx) => {
                  return (
                    <>
                      <GridItem fontSize={'xs'} fontWeight="bold" colSpan={3}>
                        {key[0]}
                      </GridItem>
                      <GridItem
                        paddingBottom={3}
                        fontSize={'xs'}
                        wordBreak={'break-all'}
                        colSpan={6}
                      >
                        {key[1]}
                      </GridItem>
                      <GridItem colSpan={1}>
                        {' '}
                        {idx === 0 && (
                          <Button onClick={() => props.findParent(key[1])}>
                            <SearchIcon />
                          </Button>
                        )}
                      </GridItem>
                    </>
                  )
                })}
            </Grid>
          </TabPanel>
          <TabPanel>{tx.length > 0 && <SelectTx txList={tx} tx={txList} />}</TabPanel>
          <TabPanel>Uncles</TabPanel>
          <TabPanel>
            <Text wordBreak={'break-all'}>{JSON.stringify(props.block.header.toJSON())}</Text>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
