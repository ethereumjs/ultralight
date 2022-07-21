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
import { ProtocolId } from 'portalnetwork'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'
import React, { useContext, useEffect, useState } from 'react'
import { BlockContext, PortalContext, ReceiptContext, TxContext } from '../App'
import { decodeReceipt, JsonRpcReceipt, jsonRpcTx } from '../receipts'
import txReceipts from '../txReceipts.json'

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
  const { block } = useContext(BlockContext)
  const { tx } = useContext(TxContext)
  const { portal } = useContext(PortalContext)
  const { receipt, setReceipt } = useContext(ReceiptContext)
  const data = {
    baseFee: `0x${tx.getBaseFee().toJSON()}`,
    dataFee: `0x${tx.getDataFee().toJSON()}`,
    message: toHexString(tx.getMessageToSign()),
    sender_address: tx.getSenderAddress().toString(),
    sender_public_key: toHexString(tx.getSenderPublicKey()),
    up_front_cost: `0x${tx.getUpfrontCost().toJSON()}`,
    isSigned: tx.isSigned().toString(),
  }

  async function getTransactionReceipt(txHash: string): Promise<void> {
    const history = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    const rawReceipt =
      toHexString(block.hash()) ===
      '0xe62e4959741c3c68bd613de5e381dd1d80e3f9627669c06bc9a193a679e77ba5'
        ? txReceipts[props.txIdx].rawReceipt
        : toHexString((await history.eth_getTransactionReceipt(txHash)) as Uint8Array)
    const txReceipt: JsonRpcReceipt = rawReceipt
      ? (decodeReceipt(
          rawReceipt,
          txHash,
          tx,
          jsonRpcTx(tx).gasPrice,
          block,
          props.txIdx
        ) as JsonRpcReceipt)
      : {
          gasUsed: '',
          logs: [],
          logsBloom: '',
        }
    setReceipt(txReceipt)
  }

  useEffect(() => {
    getTransactionReceipt(toHexString(tx.hash()))
  }, [tx])
  return (
    <Tabs>
      <TabList>
        <Tab>TxData</Tab>
        <Tab onClick={async () => getTransactionReceipt(toHexString(tx.hash()))}>TxReceipt</Tab>
        <Tab>Logs</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <Box>
            <Table size={'sm'}>
              <Tbody>
                {Object.entries(jsonRpcTx(tx)).map(([k, v], idx) => {
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
                {receipt ? (
                  Object.entries(receipt).map(([key, value]) => {
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
                  })
                ) : (
                  <Box>
                    <Text textAlign={'center'}>
                      fetching receipt from History Network <br />
                      eth_getTransactionReceipt...
                    </Text>
                  </Box>
                )}
              </Tbody>
            </Table>
          </Box>
        </TabPanel>
        <TabPanel>
          {receipt ? (
            <>
              {receipt.logs.length > 0 ? (
                <>
                  <Accordion allowToggle size={'xs'}>
                    {receipt.logs.map((log, idx) => {
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
                </>
              ) : (
                <Box>
                  <Text>There are no Logs in this Tx</Text>
                </Box>
              )}
            </>
          ) : (
            <Box>
              <Text textAlign={'center'}>
                Fetching Logs from History Network <br />
                eth_getLogs...
              </Text>
            </Box>
          )}
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}
