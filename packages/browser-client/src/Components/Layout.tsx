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
import { AppContext, AppContextType, StateChange } from '../globalReducer'
import GetEpoch from './GetEpoch'
import GetByButtons from './GetByButton'

export default function Layout() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  function handleTabsChange(index: number) {
    dispatch({ type: StateChange.SETTAB, payload: index })
  }
  useEffect(() => {
    setTimeout(() => {
      dispatch({ type: StateChange.REFRESHPEERS })
    }, 1000)
    setInterval(() => {
      dispatch({ type: StateChange.REFRESHPEERS })
    }, 5000)
  }, [])

  return (
    <VStack width={'100%'} spacing={4} divider={<StackDivider borderColor={'gray.200'} />}>
      <Box width={'95%'}>
        <GetByButtons />
        <Tabs index={state.tabIndex} onChange={handleTabsChange}>
          <TabList width="100%" justifyContent={'space-around'}>
            <Tab>{`Network`} </Tab>
            <Tab>Block Explorer</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>{<RoutingTableView />}</TabPanel>
            <TabPanel>{state.block && <DisplayBlock />}</TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </VStack>
  )
}
