import { fromHex, toHex } from '@chainsafe/discv5'
import {
  Box,
  Heading,
  HStack,
  Tab,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react'
// eslint-disable-next-line implicit-dependencies/no-implicit
import * as TX from '@ethereumjs/tx'
import { TransactionsBuffer } from '@ethereumjs/block'
import { rlp } from 'ethereumjs-util'
import { toHexString } from './ShowInfo'

interface DisplayTxProps {
  tx: TX.TypedTransaction
}

export default function DisplayTx(props: DisplayTxProps) {
  const trans = Object.entries(props.tx.toJSON())
  const data = {
    baseFee: `0x${props.tx.getBaseFee().toJSON()}`,
    dataFee: `0x${props.tx.getDataFee().toJSON()}`,
    message_to_sign: toHexString(props.tx.getMessageToSign()),
    message_to_verify_signature: toHexString(props.tx.getMessageToVerifySignature()),
    sender_address: props.tx.getSenderAddress().toString(),
    sender_public_key: toHexString(props.tx.getSenderPublicKey()),
    up_front_cost: `0x${props.tx.getUpfrontCost().toJSON()}`,
    hash: toHexString(props.tx.hash()),
    isSigned: props.tx.isSigned().toString(),
    // raw: props.tx.raw(),
    // serialize: props.tx.serialize(),
    to_creation_address: props.tx.toCreationAddress().toString(),
    validate: props.tx.validate().toString(),
    verify_signature: props.tx.verifySignature().toString(),
  }
  //    props.tx.data

  return (
    <Box>
      <Table size={'sm'}>
        <Tbody>
          {trans.map(([k, v], idx) => {
            return (
              k !== 'data' && (
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
  )
}
