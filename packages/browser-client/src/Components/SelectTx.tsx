import { toHex } from '@chainsafe/discv5'
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
import { TypedTransaction } from '@ethereumjs/tx'
import { useState } from 'react'
import { FaChevronDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import DisplayTx from './DisplayTx'

interface SelectTxProps {
  txList: string[]
  tx: TypedTransaction[]
}

export default function SelectTx(props: SelectTxProps) {
  const [txIdx, setTxIdx] = useState(0)
  const length = props.txList.length

  return (
    <VStack>
      <HStack>
        <Button onClick={() => setTxIdx(txIdx - 1)} disabled={txIdx === 0}>
          <FaChevronLeft />
        </Button>
        <Menu>
          <MenuButton as={Button} rightIcon={<FaChevronDown />}>
            Transaction {txIdx + 1}/{length + 1}
          </MenuButton>
          <MenuList>
            <MenuOptionGroup onChange={(v) => setTxIdx(parseInt(v as string))}>
              {props.txList.map((t, idx) => {
                return (
                  <MenuItemOption value={idx.toString()} key={idx} wordBreak={'break-all'}>
                    {t}
                  </MenuItemOption>
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
      <DisplayTx tx={props.tx[txIdx]} />
    </VStack>
  )
}
