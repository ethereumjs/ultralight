import {
  Button,
  Divider,
  HStack,
  Input,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tooltip,
  Text,
  VStack,
  Box,
  StackDivider,
} from '@chakra-ui/react'
import Footer from './Footer'
import { Dispatch, SetStateAction } from 'react'
import { Block } from '@ethereumjs/block'
import { ENR } from '@chainsafe/discv5'
import HistoryNetwork from './HistoryNetwork'
import { ArrowLeftIcon, ArrowRightIcon, NotAllowedIcon } from '@chakra-ui/icons'

interface LayoutProps {
  copy: () => Promise<void>
  onOpen: () => void
  enr: string
  peerEnr: string
  setPeerEnr: Dispatch<SetStateAction<string>>
  handleClick: () => Promise<void>
  invalidHash: boolean
  handleFindContent: (blockHash: string) => Promise<void | Block>
  contentKey: string
  setContentKey: Dispatch<SetStateAction<string>>
  findParent: (hash: string) => Promise<void>
  block: Block | undefined
  peers: ENR[] | undefined
  sortedDistList: [number, string[]][]
}

export default function Layout(props: LayoutProps) {
  return (
    <VStack spacing={4} divider={<StackDivider borderColor={'gray.200'} />}>
      <Tabs size={'sm'}>
        <TabList>
          <Tab>History Network</Tab>
          <Tab isDisabled>
            State Network
            <NotAllowedIcon />{' '}
          </Tab>
          <Tab isDisabled>
            Transaction Gossip Network
            <NotAllowedIcon />{' '}
          </Tab>
          <Tab isDisabled>
            Header Gossip Network
            <NotAllowedIcon />{' '}
          </Tab>
          <Tab isDisabled>
            Canonical Indices Network
            <NotAllowedIcon />{' '}
          </Tab>
        </TabList>
        <VStack paddingTop={2} spacing={1} align="stretch">
          <HStack>
            <Button width={'100%'} onClick={props.handleClick}>
              Connect To Node
            </Button>
            <ArrowRightIcon />
            <Input
              bg="whiteAlpha.800"
              value={props.peerEnr}
              placeholder={'Node ENR'}
              onChange={(evt) => props.setPeerEnr(evt.target.value)}
            />
          </HStack>
          <Divider />
          <HStack>
            <Box shadow="md" width={'50%'} border={'1px'} borderColor="gray.200">
              <Tooltip label="click to copy">
                <Text
                  padding={2}
                  fontSize={'xs'}
                  onClick={props.copy}
                  wordBreak="break-all"
                  cursor="pointer"
                >
                  {props.enr}
                </Text>
              </Tooltip>
            </Box>
            <ArrowLeftIcon />
            <Box width={'50%'}>
              <Text fontSize={'xs'}>
                This is the ENR (Ethereum Node Record) for this browser node. To connect to a
                network, enter a Bootnode ENR above.
              </Text>
            </Box>
          </HStack>
        </VStack>
        {props.peers && props.peers.length > 0 && (
          <TabPanels>
            <TabPanel>
              <HistoryNetwork
                invalidHash={props.invalidHash}
                handleFindContent={props.handleFindContent}
                contentKey={props.contentKey}
                setContentKey={props.setContentKey}
                findParent={props.findParent}
                block={props.block}
                peers={props.peers}
                sortedDistList={props.sortedDistList}
              />
            </TabPanel>
            <TabPanel>State Network</TabPanel>
            <TabPanel>Transaction Gossip Network</TabPanel>
            <TabPanel>Header Gossip Network</TabPanel>
            <TabPanel>Canonical Indices Network</TabPanel>
          </TabPanels>
        )}
      </Tabs>
      <Box pos={'fixed'} bottom={'0'}>
        <Footer />
      </Box>
    </VStack>
  )
}
