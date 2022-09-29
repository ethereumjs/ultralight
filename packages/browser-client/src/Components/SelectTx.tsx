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
import { useContext, useEffect, useMemo, useState } from 'react'
import { FaChevronDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import DisplayTx from './DisplayTx'
import React from 'react'
import { AppContext, AppContextType } from '../globalReducer'
import {
  ExtendedEthersBlockWithTransactions,
  fromHexString,
  TxReceiptWithType,
} from 'portalnetwork'

export default function SelectTx() {
  const { state } = useContext(AppContext as React.Context<AppContextType>)
  const [receipts, setReceipts] = useState<TxReceiptWithType[]>([])
  const [search, setSearch] = useState('0x')
  const init = async () => {
    const _receipts = await state.provider!.historyProtocol.receiptManager.getReceipts(
      Buffer.from(fromHexString(state.block!.hash))
    )
    setReceipts(_receipts)
  }

  useEffect(() => {
    init()
  }, [])

  const transactions = useMemo(() => {
    const b = state.block as ExtendedEthersBlockWithTransactions
    return b.transactions
  }, [state.block])

  const [txIdx, setTxIdx] = useState(0)

  return (
    <VStack>
      <HStack>
        <Button onClick={() => setTxIdx(txIdx - 1)} disabled={txIdx === 0}>
          <FaChevronLeft />
        </Button>
        <Menu>
          <MenuButton as={Button} rightIcon={<FaChevronDown />}>
            Transaction {txIdx + 1}/{transactions.length}
          </MenuButton>
          <MenuList>
            <MenuOptionGroup onChange={(v) => setTxIdx(parseInt(v as string))}>
              {transactions
                .filter((t) => t.hash.includes(search))
                .map((t, idx) => {
                  return (
                    <MenuItemOption value={idx.toString()} key={idx} wordBreak={'break-all'}>
                      {t.hash}
                    </MenuItemOption>
                  )
                })}
            </MenuOptionGroup>
          </MenuList>
        </Menu>
        <Button onClick={() => setTxIdx(txIdx + 1)} disabled={txIdx === transactions.length - 1}>
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
          {txIdx}
        </Heading>
      </Box>
      <Box>
        <Input
          type={'text'}
          placeholder={transactions[0].hash}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>
      {<DisplayTx txIdx={txIdx} />}
    </VStack>
  )
}
