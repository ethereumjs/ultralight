import {
  Box,
  HStack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useBreakpointValue,
  VStack,
} from '@chakra-ui/react'
import { Block } from '@ethereumjs/block'
import { ethJsBlockToEthersBlockWithTxs, fromHexString } from 'portalnetwork'
import React, { useContext, useEffect } from 'react'
import bigblock from '../bigblock.json'
import { AppContext, AppContextType, StateChange } from '../globalReducer'
import DisplayBlock from './DisplayBlock'
import GetByButtons from './GetByButton'
import RoutingTableView from './RoutingTableView'
export default function Layout() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  function handleTabsChange(index: number) {
    dispatch({ type: StateChange.SETTAB, payload: index })
  }
  async function setSample() {
    const sampleBlock = await ethJsBlockToEthersBlockWithTxs(
      Block.fromRLPSerializedBlock(fromHexString(bigblock[0].rlp), {
        setHardfork: true,
      }),
    )
    dispatch({ type: StateChange.SETBLOCK, payload: sampleBlock })
  }
  useEffect(() => {
    if (state.provider) {
      for (const peer of state.provider.portal.bootnodes) {
        state.provider?.historyNetwork.addBootNode(peer)
      }
    }
    setSample()
    setTimeout(() => {
      dispatch({ type: StateChange.REFRESHPEERS })
    }, 1000)
    setInterval(() => {
      dispatch({ type: StateChange.REFRESHPEERS })
    }, 5000)
  }, [])

  const layoutVariant = useBreakpointValue({
    base: (
      <Tabs height="100%" width={'100%'} index={state.tabIndex} onChange={handleTabsChange}>
        <TabList height="5%" width="100%" justifyContent={'space-around'}>
          <Tab>
            <VStack spacing={0}>
              <Text>Network</Text>
              <Text fontSize={'xx-small'}>test network functions</Text>
            </VStack>
          </Tab>
          <Tab>
            <VStack spacing={0}>
              <Text>Block Explorer</Text>
              <Text fontSize={'xx-small'}>headers, bodies, {`&`} receipts</Text>
            </VStack>
          </Tab>
        </TabList>
        <TabPanels height="95%" width={'100%'}>
          <TabPanel height="100%" padding="0">
            {<RoutingTableView />}
          </TabPanel>
          <TabPanel height="100%" padding="1">
            {state.block && <DisplayBlock />}
          </TabPanel>
        </TabPanels>
      </Tabs>
    ),
    lg: (
      <HStack height="100%">
        <Box height="100%" width={'50%'}>
          {<RoutingTableView />}
        </Box>
        <Box padding="0" height="100%" width={'50%'}>
          {state.block && <DisplayBlock />}
        </Box>
      </HStack>
    ),
    xl: (
      <HStack height="100%">
        <Box height="100%" width={'33%'}>
          {<RoutingTableView />}
        </Box>
        <Box padding="0" height="100%" width={'67%'}>
          {state.block && <DisplayBlock />}
        </Box>
      </HStack>
    ),
  })

  return (
    <VStack height={'100%'} width={'100%'} spacing={0}>
      <Box bg="gray.500" height="3%" width={'100%'}>
        <GetByButtons />
      </Box>
      <Box height="97%" width={'100%'}>
        {layoutVariant}
      </Box>
    </VStack>
  )
}
