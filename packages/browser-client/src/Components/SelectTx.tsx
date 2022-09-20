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
} from '@chakra-ui/react'
// eslint-disable-next-line implicit-dependencies/no-implicit
import { useContext, useEffect, useState } from 'react'
import { FaChevronDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import DisplayTx from './DisplayTx'
import React from 'react'
import { AppContext, StateChange } from '../globalReducer'

export default function SelectTx() {
  const { state, dispatch } = useContext(AppContext)
  useEffect(() => {
    dispatch!({ type: StateChange.GETRECEIPTS, payload: { state: state } })
  }, [])
  const [txIdx, setTxIdx] = useState(0)
  const length = state!.block!.transactions.length
  const txString: string[] = state!.block!.transactions.map((tx) => tx)

  return (
    <VStack>
      <HStack>
        <Button onClick={() => setTxIdx(txIdx - 1)} disabled={txIdx === 0}>
          <FaChevronLeft />
        </Button>
        <Menu>
          <MenuButton as={Button} rightIcon={<FaChevronDown />}>
            Transaction {txIdx + 1}/{length}
          </MenuButton>
          <MenuList>
            <MenuOptionGroup onChange={(v) => setTxIdx(parseInt(v as string))}>
              {txString.map((t, idx) => {
                return (
                  <MenuItemOption value={idx.toString()} key={idx} wordBreak={'break-all'}>
                    {t}
                  </MenuItemOption>
                )
              })}
            </MenuOptionGroup>
          </MenuList>
        </Menu>
        <Button onClick={() => setTxIdx(txIdx + 1)} disabled={txIdx === txString.length - 1}>
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
          {txString[txIdx]}
        </Heading>
      </Box>
      <DisplayTx txIdx={txIdx} />
    </VStack>
  )
}
