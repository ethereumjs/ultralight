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
import { Log } from 'portalnetwork'
import React, { useContext, useEffect } from 'react'
import { AppContext, StateChange } from '../globalReducer'
interface DisplayTxProps {
  txIdx: number
}

export function toHexString(bytes: Uint8Array = new Uint8Array()): string {
  const hexByByte: string[] = []
  let hex = '0x'
  for (const byte of bytes) {
    if (!hexByByte[byte]) {
      hexByByte[byte] = byte < 16 ? '0' + byte.toString(16) : byte.toString(16)
    }
    hex += hexByByte[byte]
  }
  return hex
}

export default function DisplayTx(props: DisplayTxProps) {
  const { state, dispatch } = useContext(AppContext)
  const rec = state!.receipts[props.txIdx]
  const trans = Object.entries(state!.block!.transactions[props.txIdx].toJSON())
  const data = {
    baseFee: `0x${state!.block!.transactions[props.txIdx].getBaseFee()}`,
    dataFee: `0x${state!.block!.transactions[props.txIdx].getDataFee()}`,
    message_to_sign: toHexString(state!.block!.transactions[props.txIdx].getMessageToSign()),
    message_to_verify_signature: toHexString(
      state!.block!.transactions[props.txIdx].getMessageToVerifySignature()
    ),
    sender_address: state!.block!.transactions[props.txIdx].getSenderAddress().toString(),
    sender_public_key: toHexString(state!.block!.transactions[props.txIdx].getSenderPublicKey()),
    up_front_cost: `0x${state!.block!.transactions[props.txIdx].getUpfrontCost()}`,
    hash: toHexString(state!.block!.transactions[props.txIdx].hash()),
    isSigned: state!.block!.transactions[props.txIdx].isSigned().toString(),
    to_creation_address: state!.block!.transactions[props.txIdx].toCreationAddress().toString(),
    validate: state!.block!.transactions[props.txIdx].validate().toString(),
    verify_signature: state!.block!.transactions[props.txIdx].verifySignature().toString(),
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
                {trans.map(([k, v], idx) => {
                  return (
                    k !== 'data' && (
                      <Tr key={idx}>
                        <Td width={'25%'} paddingBottom={'0'} wordBreak={'break-word'}>
                          {k.replace(/_/g, ' ')}
                        </Td>
                        <Td width={'75%'} paddingBottom={'0'} wordBreak={'break-all'}>
                          {v}
                        </Td>
                      </Tr>
                    )
                  )
                })}
                {Object.entries(data).map(([k, v], idx) => {
                  return (
                    <Tr key={idx}>
                      <Td width={'25%'} paddingBottom={'0'} wordBreak={'break-word'}>
                        {k.replace(/_/g, ' ')}
                      </Td>
                      <Td width={'75%'} paddingBottom={'0'} wordBreak={'break-all'}>
                        {v}
                      </Td>
                    </Tr>
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
                      <Text wordBreak={'break-all'}>
                        {toHexString(state!.block!.transactions[props.txIdx].hash())}
                      </Text>
                    </Td>
                  </Tr>
                  <Tr>
                    <Th>
                      <Text>Cumulative Block Gas Used:</Text>
                    </Th>
                    <Td>
                      <Text>{state!.receipts[props.txIdx].cumulativeBlockGasUsed.toString()}</Text>
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
