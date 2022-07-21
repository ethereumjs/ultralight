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
import { decodeReceipt, JsonRpcReceipt, JsonRpcTx, jsonRpcTx } from '../receipts'
import { BlockContext, TxContext } from '../App'

const rawReceipts = txReceipts.map((tx) => {
  return tx.rawReceipt
})

export default function SelectTx() {
  const { tx, setTx } = useContext(TxContext)
  const { block, setBlock } = useContext(BlockContext)
  const [jsonTx, setJsonTx] = useState<JsonRpcTx>(jsonRpcTx(tx))
  const [txReceipt, setTxReceipt] = useState<JsonRpcReceipt>(
    decodeReceipt(rawReceipts[0], tx, jsonTx.gasPrice, block, 0)
  )
  const [txHash, setTxHash] = useState('0x')
  const [txIdx, setTxIdx] = useState(0)
  const len = block.transactions.length
  const length = block.transactions.filter((t) => toHexString(t.hash()).startsWith(txHash)).length

  useEffect(() => {
    setTx(block.transactions[txIdx])
    setJsonTx(jsonRpcTx(tx))
    const txReceipt: JsonRpcReceipt = decodeReceipt(
      rawReceipts[txIdx],
      tx,
      jsonTx.gasPrice,
      block,
      txIdx
    )
    setTxReceipt(txReceipt)
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
          <DisplayTx receipt={txReceipt} txIdx={txIdx} />
        </Box>
      </HStack>
    </VStack>
  )
}
