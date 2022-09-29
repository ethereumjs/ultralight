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
import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AppContext, AppContextType } from '../globalReducer'
interface DisplayTxProps {
  txIdx: number
}

export default function DisplayTx(props: DisplayTxProps) {
  const { state } = useContext(AppContext as React.Context<AppContextType>)
  const [receipt, setReceipt] = useState<TransactionReceipt>()
  const tx = useMemo(() => {
    return state.block!.transactions[props.txIdx]
  }, [props.txIdx, state.block])

  async function _setReceipt(tx: TransactionResponse) {
    setReceipt(await tx.wait())
  }

  useEffect(() => {
    try {
      _setReceipt(tx as TransactionResponse)
    } catch {}
  }, [tx])
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
                {Object.entries(tx).map(([k, v], idx) => {
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
            {receipt && (
              <Table>
                <Thead>
                  {Object.entries(receipt).map(([k, v]) => {
                    return (
                      <Tr key={k}>
                        <Th>{k}</Th>
                        <Td>{v && <Text>{v._hex ?? v}</Text>}</Td>
                      </Tr>
                    )
                  })}

                  <Tr>
                    <Th>
                      <Text>Logs: </Text>
                    </Th>
                    <Td>
                      <HStack>
                        {receipt.logs.length > 0 ? (
                          <VStack>
                            {receipt.logs.map((log) => {
                              return (
                                <VStack border={'1px'}>
                                  {Object.entries(log).map(([k, v], idx) => {
                                    return (
                                      <Text>
                                        {idx}
                                        {/* {v} */}
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
