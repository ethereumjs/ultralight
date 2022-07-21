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
import { TypedTransaction } from '@ethereumjs/tx'
import { useContext, useEffect, useState } from 'react'
import { FaChevronDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import DisplayTx from './DisplayTx'
import React from 'react'
import txReceipts from '../txReceipts.json'
import { decodeReceipt, JsonRpcReceipt, JsonRpcTx, jsonRpcTx } from '../receipts'
import { BlockContext } from '../App'

const rawReceipts = txReceipts.map((tx) => {
  return tx.rawReceipt
})

interface SelectTxProps {
  txList: string[]
  tx: TypedTransaction[]
}

export default function SelectTx(props: SelectTxProps) {
  const { block, setBlock } = useContext(BlockContext)
  const [txHash, setTxHash] = useState('0x')
  const [txIdx, setTxIdx] = useState(0)

  const jsonTx: JsonRpcTx = jsonRpcTx(props.tx[txIdx])
  const [txReceipt, setTxReceipt] = useState<JsonRpcReceipt>(
    decodeReceipt(rawReceipts[txIdx], props.tx[txIdx], jsonTx.gasPrice, block, txIdx)
  )
  const len = props.txList.length
  const length = props.txList.filter((t) => t.startsWith(txHash)).length

  useEffect(() => {
    const jsonTx: JsonRpcTx = jsonRpcTx(props.tx[txIdx])
    const txReceipt: JsonRpcReceipt = decodeReceipt(
      rawReceipts[txIdx],
      props.tx[txIdx],
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
              {props.txList.map((t, idx) => {
                return (
                  t.startsWith(txHash) && (
                    <MenuItemOption value={idx.toString()} key={idx} wordBreak={'break-all'}>
                      {t}
                    </MenuItemOption>
                  )
                )
              })}
            </MenuOptionGroup>
          </MenuList>
        </Menu>
        <Button onClick={() => setTxIdx(txIdx + 1)} disabled={txIdx === props.txList.length - 1}>
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
          {props.txList[txIdx]}
        </Heading>
      </Box>
      <HStack height={'vh'} justifyContent={'start'} align={'start'}>
        <Box width={'65%'} height={'100%'}>
          <DisplayTx tx={props.tx[txIdx]} receipt={txReceipt} txIdx={txIdx} />
        </Box>
      </HStack>
    </VStack>
  )
}
