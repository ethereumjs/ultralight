import {
  Button,
  FormControl,
  HStack,
  Input,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import { Block } from '@ethereumjs/block'
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import DisplayBlock from './DisplayBlock'
import RoutingTableView from './RoutingTableView'
import { ENR } from 'portalnetwork'
import GetBlockByNumber from './GetBlockByNumber'

interface HistoryNetworkProps {
  findParent: (hash: string) => Promise<void>
  block: Block | undefined
  invalidHash: boolean
  getBlockByHash: (blockHash: string) => Promise<void | Block>
  blockHash: string
  setBlockHash: Dispatch<SetStateAction<string>>
  peers: ENR[] | undefined
  sortedDistList: [number, string[]][]
}

export default function HistoryNetwork(props: HistoryNetworkProps) {
  const [tabIndex, setTabIndex] = useState(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  function handleTabsChange(index: number) {
    setTabIndex(index)
  }

  async function handleClick() {
    setIsLoading(true)
    await props.getBlockByHash(props.blockHash)
    setTabIndex(1)
    setIsLoading(false)
  }

  async function findParent(hash: string) {
    setIsLoading(true)
    await props.findParent(hash)
  }

  useEffect(() => {
    setIsLoading(false)
  }, [props.block])

  return (
    <>
      <HStack>
        <Button
          isLoading={isLoading}
          width={'100%'}
          disabled={props.invalidHash}
          onClick={async () => handleClick()}
        >
          Get Block by Blockhash
        </Button>
        <FormControl isInvalid={props.invalidHash}>
          <Input
            bg="whiteAlpha.800"
            placeholder={'Block Hash'}
            value={props.blockHash}
            onChange={(evt) => {
              props.setBlockHash(evt.target.value)
            }}
          />
        </FormControl>
      </HStack>
      <GetBlockByNumber setIsLoading={setIsLoading} setBlockHash={props.setBlockHash} />
      <Tabs index={tabIndex} onChange={handleTabsChange}>
        <TabList>
          <Tab>Network</Tab>
          <Tab>Block Explorer</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <RoutingTableView peers={props.peers} sortedDistList={props.sortedDistList} />
          </TabPanel>
          <TabPanel>
            {props.block?.header && <DisplayBlock isLoading={isLoading} findParent={findParent} />}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
  )
}
