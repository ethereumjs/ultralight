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
} from '@chakra-ui/react'
import { JsonBlock, JsonHeader } from '@ethereumjs/block'

interface DisplayBlockProps {
  header: JsonHeader
  block?: JsonBlock
}

export default function DisplayBlock(props: DisplayBlockProps) {
  const header = Object.entries(props.header)
  const tx: string[] = []

  return (
    <Box>
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
                    <Th>{tx}</Th>
                  </Tr>
                )}
              </Thead>
            </Table>
          </TabPanel>
          <TabPanel>Uncles</TabPanel>
          <TabPanel>
            <Text>{JSON.stringify(props.header)}</Text>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
