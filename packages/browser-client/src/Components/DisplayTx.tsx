import {
  Box,
  HStack,
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react'
import { BlockWithTransactions, TransactionResponse } from '@ethersproject/abstract-provider'
import { Log } from 'portalnetwork'
import React, { useContext } from 'react'
import { AppContext, AppContextType } from '../globalReducer'
interface DisplayTxProps {
  txIdx: number
}

export default function DisplayTx(props: DisplayTxProps) {
  const { state } = useContext(AppContext as React.Context<AppContextType>)
  const rec = state.receipts[props.txIdx]
  const tx = Object.entries(
    (state.block! as BlockWithTransactions).transactions[props.txIdx] as TransactionResponse
  )
  const txData = []
  const validKeys = [
    'hash',
    'type',
    'blockHash',
    'blockNumber',
    'from',
    'gasPrice',
    'gasLimit',
    'to',
    'value',
    'nonce',
    'maxFeePerGas',
    'maxPriorityFeePerGas',
  ]
  for (const entry of tx) {
    if (validKeys.indexOf(entry[0]) >= 0) {
      txData.push(entry)
    }
  }

  return (
    <Box width="100%">
      <Tabs>
        <TabList>
          <Tab>Transaction</Tab>
          <Tab>Receipt</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Table size={'sm'}>
              <Tbody>
                {txData.map(([k, v], idx) => {
                  return (
                    k !== 'data' && (
                      <Tr key={idx}>
                        <Td width={'25%'} paddingBottom={'0'} wordBreak={'break-word'}>
                          {k.replace(/_/g, ' ')}
                        </Td>
                        <Td width={'75%'} paddingBottom={'0'} wordBreak={'break-all'}>
                          {v?.toString()}
                        </Td>
                      </Tr>
                    )
                  )
                })}
              </Tbody>
            </Table>
          </TabPanel>
          <TabPanel>
            {rec && (
              <Table>
                <Thead>
                  <Tr>
                    <Th>
                      <Text>Transaction Index </Text>
                    </Th>
                    <Td>
                      <Text>{props.txIdx} </Text>
                    </Td>
                  </Tr>
                  <Tr>
                    <Th>
                      <Text>Transaction Hash</Text>
                    </Th>
                    <Td>
                      <Text wordBreak={'break-all'}>{txData[0][1]}</Text>
                    </Td>
                  </Tr>
                  <Tr>
                    <Th>
                      <Text>Cumulative Block Gas Used:</Text>
                    </Th>
                    <Td>
                      <Text>{state.receipts[props.txIdx].cumulativeBlockGasUsed.toString()}</Text>
                    </Td>
                  </Tr>
                  <Tr>
                    <Th>
                      <Text>Bit Vector: </Text>
                    </Th>
                    <Td>{rec.bitvector && <Text>{Uint8Array.from(rec.bitvector)}</Text>}</Td>
                  </Tr>
                  <Tr>
                    <Th>
                      <Text>Logs: </Text>
                    </Th>
                    <Td>
                      <HStack>
                        {rec.logs.length > 0 ? (
                          <VStack>
                            {rec.logs.map((log: Log) => {
                              return (
                                <VStack border={'1px'}>
                                  {log.map((v, idx) => {
                                    return (
                                      <Text>
                                        {idx}
                                        {v}
                                      </Text>
                                    )
                                  })}
                                </VStack>
                              )
                            })}
                          </VStack>
                        ) : (
                          <Text>{'[ ]'}</Text>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                </Thead>
              </Table>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
