import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
  StackDivider,
  Box,
  IconButton,
} from '@chakra-ui/react'
import React, { useContext, useEffect } from 'react'
import { RepeatIcon } from '@chakra-ui/icons'
import GetBlockByHash from './getBlockByHash'
import GetBlockByNumber from './GetBlockByNumber'
import RoutingTableView from './RoutingTableView'
import DisplayBlock from './DisplayBlock'
import { AppContext, StateChange } from '../globalReducer'

export default function Layout() {
  const { state, dispatch } = useContext(AppContext)
  function handleTabsChange(index: number) {
    dispatch!({ type: StateChange.SETTAB, payload: index })
  }
  useEffect(() => {
    setTimeout(() => {
      dispatch!({ type: StateChange.REFRESHPEERS })
    }, 1000)
    setInterval(() => {
      dispatch!({ type: StateChange.REFRESHPEERS })
    }, 5000)
  }, [])

  return (
    <VStack width={'100%'} spacing={4} divider={<StackDivider borderColor={'gray.200'} />}>
      {state && dispatch && (
        <Box width={'95%'}>
          <GetBlockByHash />
          <GetBlockByNumber />
          <Tabs index={state.tabIndex} onChange={handleTabsChange}>
            <TabList>
              <IconButton
                onClick={() => dispatch!({ type: StateChange.REFRESHPEERS })}
                aria-label="refresh routing table"
                icon={<RepeatIcon />}
              />
              <Tab>{`Network`} </Tab>
              <Tab>Block Explorer</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>{<RoutingTableView />}</TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      )}
    </VStack>
  )
}
