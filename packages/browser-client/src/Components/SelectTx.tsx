import {
  Menu,
  MenuButton,
  Button,
  MenuList,
  MenuOptionGroup,
  MenuItemOption,
  VStack,
  Heading,
  Box,
  HStack,
  Input,
} from '@chakra-ui/react'
// eslint-disable-next-line implicit-dependencies/no-implicit
import { Transaction, TypedTransaction } from '@ethereumjs/tx'
import { createContext, useContext, useEffect, useState } from 'react'
import { FaChevronDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import DisplayTx, { toHexString } from './DisplayTx'
import React from 'react'
import txReceipts from '../txReceipts.json'
import { decodeReceipt, jsonRpcReceipt, JsonRpcReceipt, JsonRpcTx, jsonRpcTx } from '../receipts'
import { BlockContext, PortalContext, ReceiptContext, TxContext } from '../App'
import { ProtocolId } from 'portalnetwork'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'

const rawReceipts = txReceipts.map((tx) => {
  return tx.rawReceipt
})

export default function SelectTx() {
  const { portal } = useContext(PortalContext)
  const { tx, setTx } = useContext(TxContext)
  const { block, setBlock } = useContext(BlockContext)
  const [jsonTx, setJsonTx] = useState<JsonRpcTx>(jsonRpcTx(tx))
  const { receipt, setReceipt } = useContext(ReceiptContext)
  const [txHash, setTxHash] = useState('0x')
  const [txIdx, setTxIdx] = useState(0)
  const len = block.transactions.length
  const length = block.transactions.filter((t) => toHexString(t.hash()).startsWith(txHash)).length

  async function getTransactionReceipt(txHash: string): Promise<void> {
    const history = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    const rawReceipt =
      toHexString(block.hash()) ===
      '0xe62e4959741c3c68bd613de5e381dd1d80e3f9627669c06bc9a193a679e77ba5'
        ? txReceipts[txIdx].rawReceipt
        : toHexString((await history.eth_getTransactionReceipt(txHash)) as Uint8Array)
    const txReceipt: JsonRpcReceipt = rawReceipt
      ? (decodeReceipt(
          rawReceipt,
          txHash,
          tx,
          jsonRpcTx(tx).gasPrice,
          block,
          txIdx
        ) as JsonRpcReceipt)
      : {
          gasUsed: '',
          logs: [],
          logsBloom: '',
        }
    setReceipt(txReceipt)
  }

  useEffect(() => {
    setTx(block.transactions[txIdx])
    setJsonTx(jsonRpcTx(block.transactions[txIdx]))
    getTransactionReceipt(toHexString(block.transactions[txIdx].hash()))
  }, [txIdx])

  return (
    <VStack>
      <Input placeholder="0x" value={txHash} onChange={(e) => setTxHash(e.target.value)} />
      <HStack>
        <Button onClick={() => setTxIdx(txIdx - 1)} disabled={txIdx === 0}>
          <FaChevronLeft />
        </Button>
        <Menu>
          <MenuButton as={Button} rightIcon={<FaChevronDown />}>
            Transactions {length}/{len}
          </MenuButton>
          <MenuList>
            <MenuOptionGroup onChange={(v) => setTxIdx(parseInt(v as string))}>
              {block.transactions.map((t, idx) => {
                return (
                  toHexString(t.hash()).startsWith(txHash) && (
                    <MenuItemOption value={idx.toString()} key={idx} wordBreak={'break-all'}>
                      {toHexString(t.hash())}
                    </MenuItemOption>
                  )
                )
              })}
            </MenuOptionGroup>
          </MenuList>
        </Menu>
        <Button
          onClick={() => setTxIdx(txIdx + 1)}
          disabled={txIdx === block.transactions.length - 1}
        >
          <FaChevronRight />
        </Button>
      </HStack>
      <Box>
        <Heading
          paddingInline={`2`}
          marginInline={'2'}
          textAlign={'center'}
          size={'xs'}
          wordBreak={'break-all'}
        >
          {toHexString(tx.hash())}
        </Heading>
      </Box>
      <HStack height={'vh'} justifyContent={'start'} align={'start'}>
        <Box width={'65%'} height={'100%'}>
          <DisplayTx txIdx={txIdx} />
        </Box>
      </HStack>
    </VStack>
  )
}
