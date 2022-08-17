import * as React from 'react'
import { BrowserLevel } from 'browser-level'
import {
  theme,
  useClipboard,
  Button,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Box,
  Heading,
  Center,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  Divider,
  ChakraProvider,
  HStack,
  Input,
} from '@chakra-ui/react'
import {
  PortalNetwork,
  ProtocolId,
  ENR,
  log2Distance,
  fromHexString,
  WebSocketTransportService,
} from 'portalnetwork'
import { Block } from '@ethereumjs/block'
import DevTools from './Components/DevTools'
import StartNode from './Components/StartNode'
import Layout from './Components/Layout'
import { Capacitor } from '@capacitor/core'
import { HamburgerIcon } from '@chakra-ui/icons'
import Footer from './Components/Footer'
import InfoMenu from './Components/InfoMenu'
import bns from './bootnodes.json'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'
import { TransportLayer } from 'portalnetwork/dist/client'
import { toHexString } from './Components/DisplayTx'
export const lightblue = theme.colors.blue[100]
export const mediumblue = theme.colors.blue[200]
export const PortalContext = React.createContext(PortalNetwork.prototype)
export const BlockContext = React.createContext({
  block: Block.prototype,
  setBlock: (() => {}) as React.Dispatch<React.SetStateAction<Block>>,
})
export const HistoryProtocolContext = React.createContext(HistoryProtocol.prototype)

export const App = () => {
  const [portal, setPortal] = React.useState<PortalNetwork>()
  const [historyProtocol, setHistoryProtocol] = React.useState<HistoryProtocol>()
  const [peers, setPeers] = React.useState<ENR[]>([])
  const [sortedDistList, setSortedDistList] = React.useState<[number, string[]][]>([])
  const [enr, setENR] = React.useState<string>('')
  const [id, _setId] = React.useState<string>('')
  const [peerEnr, setPeerEnr] = React.useState('')
  const [blockHash, setBlockHash] = React.useState<string>(
    '0xf37c632d361e0a93f08ba29b1a2c708d9caa3ee19d1ee8d2a02612bffe49f0a9'
  )
  const [proxy, setProxy] = React.useState('ws://127.0.0.1:5050')
  const [block, setBlock] = React.useState<Block>(Block.prototype)
  const blockValue = React.useMemo(() => ({ block, setBlock }), [block])
  const { onCopy } = useClipboard(enr)
  const { onOpen } = useDisclosure()
  const disclosure = useDisclosure()
  const [modalStatus, setModal] = React.useState(false)
  const LDB = new BrowserLevel('ultralight_history', { prefix: '', version: 1 })

  function updateAddressBook() {
    try {
      const known = historyProtocol!.routingTable.values()
      const formattedKnown: [number, string, string, string, string][] = known.map((_enr: ENR) => {
        const distToSelf = log2Distance(id, _enr.nodeId)
        return [
          distToSelf,
          `${_enr.ip}`,
          `${_enr.getLocationMultiaddr('udp')?.nodeAddress().port}`,
          _enr.nodeId,
          _enr.encodeTxt(),
        ]
      })
      const sorted = formattedKnown.sort((a: any, b: any) => a[0] - b[0])
      const table: [number, string[]][] = sorted.map((d) => {
        return [d[0], [d[1], d[2], d[3], d[4]]]
      })
      setSortedDistList(table)
      const peers = historyProtocol!.routingTable.values()
      setPeers(peers)
    } catch {}
  }

  async function handleClick() {
    try {
      const protocol = portal?.protocols.get(ProtocolId.HistoryNetwork)
      await protocol?.addBootNode(peerEnr)
    } catch (err) {}
    setPeerEnr('')
    updateAddressBook()
    // Only rerender the address book if we actually got a response from the node
  }

  async function createNodeFromScratch(): Promise<PortalNetwork> {
    const node = Capacitor.isNativePlatform()
      ? await PortalNetwork.create({
          bootnodes: bns,
          db: LDB as any,
          transport: TransportLayer.MOBILE,
        })
      : await PortalNetwork.create({
          proxyAddress: proxy,
          bootnodes: bns,
          db: LDB as any,
          transport: TransportLayer.WEB,
        })
    return node
  }

  async function createNodeFromStorage(): Promise<PortalNetwork> {
    const node = Capacitor.isNativePlatform()
      ? await PortalNetwork.create({
          bootnodes: bns,
          db: LDB as any,
          rebuildFromMemory: true,
          transport: TransportLayer.MOBILE,
        })
      : await PortalNetwork.create({
          proxyAddress: proxy,
          bootnodes: bns,
          db: LDB as any,
          rebuildFromMemory: true,
          transport: TransportLayer.WEB,
        })
    return node
  }

  const init = async () => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist()
    }
    let node: PortalNetwork
    if (process.env.BINDADDRESS) {
      node = await PortalNetwork.create({
        supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.CanonicalIndicesNetwork],
        proxyAddress: proxy,
        db: LDB as any,
        transport: TransportLayer.WEB,
        //@ts-ignore
        config: {
          config: {
            enrUpdate: true,
            addrVotesToUpdateEnr: 1,
          },
        },
      })
    } else {
      try {
        node = await createNodeFromStorage()
      } catch {
        node = await createNodeFromScratch()
      }
    }

    // Listen for proxy reflected multiaddr to allow browser client to specify a valid ENR if doing local testing
    if (
      node.discv5.sessionService.transport instanceof WebSocketTransportService &&
      process.env.BINDADDRESS
    ) {
      node.discv5.sessionService.transport.once('multiAddr', (multiaddr) => {
        node.discv5.enr.setLocationMultiaddr(multiaddr)
        // Remove listener after multiAddr received from proxy as this is a one time event
        node.discv5.sessionService.transport.removeAllListeners('multiAddr')
      })
    }

    setPortal(node)
    try {
      setHistoryProtocol(node.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol)
    } catch {}
    node.enableLog('*Portal*, -*uTP*, -*FINDNODES*')
    await node.start()
    node.storeNodeDetails()
    ;(window as any).portal = node
    ;(window as any).ENR = ENR
    ;(window as any).hexer = { toHexString, fromHexString }
    node.discv5.on('multiaddrUpdated', () => {
      setENR(node.discv5.enr.encodeTxt(node.discv5.keypair.privateKey))
      portal?.storeNodeDetails()
    })
  }

  const copy = async () => {
    await setENR(portal?.discv5.enr.encodeTxt(portal.discv5.keypair.privateKey) ?? '')
    onCopy()
  }

  React.useEffect(() => {
    init()
  }, [])

  async function getBlockByHash(_blockHash: string) {
    const prevBlock = blockHash
    if (portal) {
      if (_blockHash.slice(0, 2) !== '0x') {
        setBlockHash('')
      } else {
        const protocol = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
        if (!protocol) return
        const block = await protocol.getBlockByHash(_blockHash, true)
        try {
          setBlock(block!)
        } catch {
          setBlockHash(prevBlock)
        }
      }
    }
  }

  async function findParent(hash: string) {
    setBlockHash(hash)
    getBlockByHash(hash)
    portal?.logger('Showing Block')
  }

  const openInfoMenu = () => {
    setModal(true)
    disclosure.onClose()
  }
  const invalidHash = /([^0-z])+/.test(blockHash)

  return (
    <ChakraProvider theme={theme}>
      {portal && (
        <PortalContext.Provider value={portal}>
          <Center bg={'gray.200'}>
            <VStack width={'80%'}>
              <Heading size={'2xl'} textAlign="start">
                Ultralight
              </Heading>
              <Heading size={'l'} textAlign="start">
                Portal Network Explorer
              </Heading>
            </VStack>
          </Center>
          <Button
            position="fixed"
            top="5"
            right="5"
            leftIcon={<HamburgerIcon />}
            onClick={disclosure.onOpen}
          ></Button>
          <Drawer isOpen={disclosure.isOpen} placement="right" onClose={disclosure.onClose}>
            <DrawerOverlay />
            <DrawerContent>
              <DrawerCloseButton />
              <DrawerHeader>Ultralight</DrawerHeader>
              <DrawerBody>
                <Button w="100%" mb="5px" onClick={openInfoMenu}>
                  More Info
                </Button>
                {!Capacitor.isNativePlatform() && (
                  <>
                    <Divider my="10px" />
                    <StartNode setProxy={setProxy} init={init} />
                  </>
                )}
                <Divider my="10px" />
                <DevTools
                  peerEnr={peerEnr}
                  setPeerEnr={setPeerEnr}
                  native={Capacitor.isNativePlatform()}
                  enr={enr}
                  copy={copy}
                  peers={peers!}
                  handleClick={handleClick}
                />
              </DrawerBody>
              <DrawerFooter>
                <Button onClick={disclosure.onClose}>CLOSE</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          {historyProtocol && (
            <HStack border={'1px'} width={'100%'} paddingY={1}>
              <Button width={'25%'} bgColor={'blue.100'} size={'xs'} onClick={handleClick}>
                Connect to new peer
              </Button>
              <Input
                width={'75%'}
                size={'xs'}
                type="text"
                placeholder={'enr:IS...'}
                value={peerEnr}
                onChange={(e) => {
                  setPeerEnr(e.target.value)
                }}
              />
            </HStack>
          )}
          <Divider />

          <Box>
            {historyProtocol && (
              <HistoryProtocolContext.Provider value={historyProtocol}>
                <BlockContext.Provider value={blockValue}>
                  <Layout
                    copy={copy}
                    onOpen={onOpen}
                    enr={enr}
                    peerEnr={peerEnr}
                    setPeerEnr={setPeerEnr}
                    handleClick={handleClick}
                    invalidHash={invalidHash}
                    getBlockByHash={getBlockByHash}
                    blockHash={blockHash}
                    setBlockHash={setBlockHash}
                    findParent={findParent}
                    block={block}
                    peers={peers}
                    sortedDistList={sortedDistList}
                    capacitor={Capacitor}
                    refresh={updateAddressBook}
                  />
                </BlockContext.Provider>
              </HistoryProtocolContext.Provider>
            )}
          </Box>
          <Box width={'100%'} pos={'fixed'} bottom={'0'}>
            <Center>
              <Footer />
            </Center>
          </Box>
          <Modal isOpen={modalStatus} onClose={() => setModal(false)}>
            <ModalOverlay />
            <ModalContent>
              <InfoMenu />
            </ModalContent>
          </Modal>
        </PortalContext.Provider>
      )}
    </ChakraProvider>
  )
}
