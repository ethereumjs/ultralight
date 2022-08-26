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
import React, { useContext, useEffect, useState } from 'react'
import { RepeatIcon } from '@chakra-ui/icons'
import { BlockContext } from '../ContextHooks'
import GetBlockByHash from './getBlockByHash'
import GetBlockByNumber from './GetBlockByNumber'
import RoutingTableView from './RoutingTableView'
import DisplayBlock from './DisplayBlock'
import GetHeaderProofByHash from './GetHeaderProofByHash'
import ValidateAccumulator from './ValidateAccumulator'
interface LayoutProps {
  table: [number, string[]][]
  refresh: () => void
  peers: boolean
}

export default function Layout(props: LayoutProps) {
  const { block } = useContext(BlockContext)
  const [tabIndex, setTabIndex] = useState(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  function handleTabsChange(index: number) {
    setTabIndex(index)
  }
  useEffect(() => {
    setTimeout(() => {
      props.refresh()
    }, 1000)
    setInterval(() => {
      props.refresh()
    }, 5000)
  }, [])

  return (
    <VStack width={'100%'} spacing={4} divider={<StackDivider borderColor={'gray.200'} />}>
      {props.peers && (
        <Box width={'95%'}>
          <GetBlockByHash setIsLoading={setIsLoading} />
          <GetBlockByNumber setIsLoading={setIsLoading} />
          <GetHeaderProofByHash />
          <Tabs index={tabIndex} onChange={handleTabsChange}>
            <TabList>
              <IconButton
                onClick={props.refresh}
                aria-label="refresh routing table"
                icon={<RepeatIcon />}
              />
              <Tab>{`Network`} </Tab>
              <Tab>Block Explorer</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>{<RoutingTableView table={props.table} />}</TabPanel>
              <TabPanel>
                {block.header && <DisplayBlock setIsLoading={setIsLoading} isLoading={isLoading} />}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      )}
    </VStack>
  )
}
