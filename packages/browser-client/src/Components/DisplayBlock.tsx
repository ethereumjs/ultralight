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
  const headerObj: Record<string, string | number> = {
    baseFee: header.baseFee!,
    baseFeePerGas: header.baseFeePerGas!,
    bloom: parseInt(header.bloom!.toString()),
    coinbase: header.coinbase!,
    difficutly: header.difficulty!,
    extraData: header.extraData!,
    gasLimit: header.gasLimit!,
    gasUsed: header.gasUsed!,
    logsBloom: Number(header.logsBloom!),
    mixHash: header.mixHash!,
    nonce: header.nonce!,
    number: Number(header.number!),
    parentHash: header.parentHash!,
    receiptTrie: header.receiptTrie!,
    stateRoot: header.stateRoot!,
    timestamp: new Date(parseInt(header.timestamp!)).toString(),
    transactionsTrie: header.transactionsTrie!,
    uncleHash: header.uncleHash!,
  }
  const tx = json.transactions
  // const uncles = json.uncleHeaders
  function handleClick(hash: string) {
    props.findContent(hash)
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
                  {Object.keys(headerObj).map((key, idx) => {
                    return (
                      <Tr key={idx}>
                        <Th>{key}</Th>
                        <Td>
                          {key === 'parentHash' ? (
                            <Link onClick={() => handleClick(headerObj[key] as string)}>
                              {headerObj[key]}
                            </Link>
                          ) : (
                            headerObj[key]
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
