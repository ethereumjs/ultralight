import {
  Box,
  TabPanels,
  TabPanel,
  Tab,
  TabList,
  Tabs,
  Table,
  Thead,
  Tr,
  Th,
  Text,
  Heading,
} from '@chakra-ui/react'
import { Block } from '@ethereumjs/block'
import { toHexString } from './ShowInfo'

interface DisplayBlockProps {
  block: Block
}

export default function DisplayBlock(props: DisplayBlockProps) {
  const header = Object.entries(props.block!.header!.toJSON())
  const tx: string[] = props.block.transactions.map((tx) => '0x' + tx.hash().toString('hex'))
  return (
    <Box>
      <Heading padding={4} size="md" textAlign={'center'}>
        Block Explorer
      </Heading>
      <Heading paddingBottom={4} size="sm" textAlign={'center'}>
        {toHexString(props.block.hash())}
      </Heading>
      <Tabs>
        <TabList>
          <Tab>Header</Tab>
          <Tab>Transactions</Tab>
          <Tab>Uncles</Tab>
          <Tab>JSON</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Table size={'sm'} variant="simple">
              <Thead>
                {header &&
                  header.map((key) => {
                    return (
                      <Tr key={key[0] + key[1]}>
                        <Th>{key[0]}</Th>
                        <Th wordBreak={'break-all'}>{key[1]}</Th>
                      </Tr>
                    )
                  })}
              </Thead>
            </Table>
          </TabPanel>
          <TabPanel>
            <Table size={'sm'} variant="simple">
              <Thead>
                {tx && (
                  <Tr>
                    <Th>tx</Th>
                    <Th wordBreak={'break-all'}>{tx}</Th>
                  </Tr>
                )}
              </Thead>
            </Table>
          </TabPanel>
          <TabPanel>Uncles</TabPanel>
          <TabPanel>
            <Text wordBreak={'break-all'}>{JSON.stringify(props.block.header.toJSON())}</Text>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
