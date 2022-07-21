import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Tab,
  Table,
  TabList,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Tr,
  TabPanel,
  Accordion,
  AccordionPanel,
  AccordionItem,
  AccordionButton,
  Text,
} from '@chakra-ui/react'
import { TypedTransaction } from '@ethereumjs/tx'
import React from 'react'
import { JsonRpcReceipt, JsonRpcTx, jsonRpcTx } from '../receipts'

interface DisplayTxProps {
  tx: TypedTransaction
  receipt: JsonRpcReceipt
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
  const jsonTx: JsonRpcTx = jsonRpcTx(props.tx)
  const data = {
    baseFee: `0x${props.tx.getBaseFee().toJSON()}`,
    dataFee: `0x${props.tx.getDataFee().toJSON()}`,
    message: toHexString(props.tx.getMessageToSign()),
    sender_address: props.tx.getSenderAddress().toString(),
    sender_public_key: toHexString(props.tx.getSenderPublicKey()),
    up_front_cost: `0x${props.tx.getUpfrontCost().toJSON()}`,
    isSigned: props.tx.isSigned().toString(),
  }
  return (
    <Tabs>
      <TabList>
        <Tab>TxData</Tab>
        <Tab>TxReceipt</Tab>
        <Tab>Logs</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <Box>
            <Table size={'sm'}>
              <Tbody>
                {Object.entries(jsonTx).map(([k, v], idx) => {
                  return (
                    typeof v === 'string' && (
                      <Tr key={idx}>
                        <Td paddingBottom={'0'}>{k}</Td>
                        <Td paddingBottom={'0'} wordBreak={'break-all'}>
                          {v}
                        </Td>
                      </Tr>
                    )
                  )
                })}
                {Object.entries(data).map(([k, v], idx) => {
                  return (
                    <Tr key={idx}>
                      <Td paddingBottom={'0'}>{k}</Td>
                      <Td paddingBottom={'0'} wordBreak={'break-all'}>
                        {v}
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Box>
        </TabPanel>
        <TabPanel>
          <Box>
            <Table size="sm">
              <Tbody>
                {Object.entries(props.receipt).map(([key, value]) => {
                  return (
                    <Tr key={key}>
                      <Td>{key}</Td>
                      <Td wordBreak={'break-all'}>
                        {typeof value === 'string'
                          ? value
                          : value === null
                          ? 'null'
                          : typeof value === 'object'
                          ? Object.values(value).length
                          : typeof value}
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Box>
        </TabPanel>
        <TabPanel>
          {props.receipt.logs && (
            <Accordion allowToggle size={'xs'}>
              {props.receipt.logs.map((log, idx) => {
                return (
                  <AccordionItem key={idx}>
                    <AccordionButton>
                      <Box textAlign={'left'}>
                        Log {log.logIndex} <ChevronDownIcon />
                      </Box>
                    </AccordionButton>
                    <AccordionPanel>
                      <Table size={'sm'}>
                        <Tbody>
                          {Object.entries(log).map(([key, value]) => {
                            return (
                              <Tr key={key}>
                                <Td>{key}</Td>
                                <Td wordBreak={'break-all'}>
                                  {typeof value === 'object'
                                    ? value?.map((v, idx) => {
                                        const color = idx % 2 === 0 ? 'gray.100' : 'gray.300'
                                        return (
                                          <Text key={v} bgColor={color}>
                                            {v.toString()}
                                          </Text>
                                        )
                                      })
                                    : value.toString()}
                                </Td>
                              </Tr>
                            )
                          })}
                        </Tbody>
                      </Table>
                    </AccordionPanel>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}
