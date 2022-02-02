import {
  Container,
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
  Td,
  Text,
  Link,
} from '@chakra-ui/react'
import { Block, BlockHeader, JsonHeader } from '@ethereumjs/block'
import Common from '@ethereumjs/common'
import { toBuffer } from 'ethereumjs-util'

interface DisplayBlockProps {
  rlpHeader: string
  findContent: any
}

export default function DisplayBlock(props: DisplayBlockProps) {
  const rlpHeader = props.rlpHeader
  const chain = 'mainnet'
  const common = new Common({ chain: chain })
  const blockHeader = BlockHeader.fromRLPSerializedHeader(toBuffer(rlpHeader), { common: common })
  const block = new Block(blockHeader)
  const json = block.toJSON()
  const header: JsonHeader = json.header!

  const obj = Object.entries(header)
  const tx = json.transactions

  function handleClick(hash: string) {
    props.findContent(hash)
  }

  const formatValue = (value: string): string | number => {
    const valueLength = value.slice(2).length
    if (valueLength >= 40 && valueLength <= 64) {
      return value
    } else if (valueLength < 32) {
      return parseInt(value, 16)
    }
    return value.slice(0, 32) + '...'
  }
  return (
    <Container>
      <Box>
        <Tabs>
          <TabList>
            <Tab>Header</Tab>
            <Tab>Transactions</Tab>
            <Tab>Uncles</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Table size={'sm'} variant="simple">
                <Thead>
                  {obj.map((key) => {
                    return (
                      <Tr key={key[0] + key[1]}>
                        <Th>{key[0]}</Th>
                        <Td>
                          {key[0] === 'parentHash' ? (
                            <Link onClick={() => handleClick(key[1] as string)}>{key[1]}</Link>
                          ) : (
                            formatValue(key[1])
                          )}
                        </Td>
                      </Tr>
                    )
                  })}
                </Thead>
              </Table>
            </TabPanel>
            <TabPanel>
              TXs
              {tx?.map((t, idx) => {
                return <Text key={idx}>{t}</Text>
              })}
            </TabPanel>
            <TabPanel>Uncles</TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  )
}
