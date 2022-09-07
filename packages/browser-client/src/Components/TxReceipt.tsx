import {
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  HStack,
  Table,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react'
import { Log, TxReceiptWithType } from 'portalnetwork'
import React from 'react'

interface TxReceiptProps {
  rec: TxReceiptWithType
  idx: number
  hash: string
}

export default function TxReceipt(props: TxReceiptProps) {
  const { rec, idx, hash } = props
  return (
    <AccordionItem>
      <h2>
        <AccordionButton>
          <Box flex="1" textAlign="left">
            TxReceipt: {idx}
          </Box>
          <AccordionIcon />
        </AccordionButton>
      </h2>
      <AccordionPanel pb={4}>
        <Table size={'sm'} key={`Receipt ${idx}`}>
          <Thead>
            <Tr>
              <Th>
                <Text>Transaction Index </Text>
              </Th>
              <Td>
                <Text>{idx} </Text>
              </Td>
            </Tr>
            <Tr>
              <Th>
                <Text>Transaction Hash</Text>
              </Th>
              <Td>
                <Text wordBreak={'break-all'}>{hash}</Text>
              </Td>
            </Tr>
            <Tr>
              <Th>
                <Text>Cumulative Block Gas Used:</Text>
              </Th>
              <Td>
                <Text>{rec.cumulativeBlockGasUsed.toString()}</Text>
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
      </AccordionPanel>
    </AccordionItem>
  )
}
