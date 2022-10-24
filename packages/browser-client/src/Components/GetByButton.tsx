import React, { useMemo, useState } from 'react'
import { Box, MenuButton, Menu, MenuList, Button, MenuItem, HStack } from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import GetBlockByNumber from './GetBlockByNumber'
import GetEpoch from './GetEpoch'
import GetBlockByHash from './getBlockByHash'

export default function GetByButtons() {
  enum GetBy {
    eth_getBlockByNumber = 0,
    eth_getBlockByHash = 1,
    portal_getEpochByIndex = 2,
  }
  const buttons: Record<GetBy, JSX.Element> = {
    0: <GetBlockByNumber />,
    1: <GetBlockByHash />,
    2: <GetEpoch />,
  }

  const [button, setButton] = useState<GetBy>(GetBy.eth_getBlockByNumber)

  return (
    <HStack width="100%">
      <Menu>
        <MenuButton width={['50%', '50%', '40%']} as={Button} rightIcon={<ChevronDownIcon />}>
          {GetBy[button]}
        </MenuButton>
        <MenuList>
          <MenuItem onClick={() => setButton(GetBy.eth_getBlockByHash)}>
            eth_getBlockByHash
          </MenuItem>
          <MenuItem onClick={() => setButton(GetBy.eth_getBlockByNumber)}>
            eth_getBlockByNumber
          </MenuItem>
          <MenuItem onClick={() => setButton(GetBy.portal_getEpochByIndex)}>
            portal_getEpochByIndex
          </MenuItem>
        </MenuList>
      </Menu>
      {buttons[button]}
    </HStack>
  )
}
