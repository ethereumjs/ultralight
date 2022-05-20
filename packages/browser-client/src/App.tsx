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
} from '@chakra-ui/react'
import {
  getHistoryNetworkContentId,
  PortalNetwork,
  reassembleBlock,
  ProtocolId,
  ENR,
  fromHexString,
  log2Distance,
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
export const lightblue = theme.colors.blue[100]
export const mediumblue = theme.colors.blue[200]
export const PortalContext = React.createContext(PortalNetwork.prototype)

export const App = () => {
  const [portal, setPortal] = React.useState<PortalNetwork>()
  const [peers, setPeers] = React.useState<ENR[]>([])
  const [sortedDistList, setSortedDistList] = React.useState<[number, string[]][]>([])
  const [enr, setENR] = React.useState<string>('')
  const [id, _setId] = React.useState<string>('')
  const [peerEnr, setPeerEnr] = React.useState('')
  const [contentKey, setContentKey] = React.useState<string>(
    '0xf37c632d361e0a93f08ba29b1a2c708d9caa3ee19d1ee8d2a02612bffe49f0a9'
  )
  const [proxy, setProxy] = React.useState('ws://127.0.0.1:5050')
  const [block, setBlock] = React.useState<Block | undefined>()
  const { onCopy } = useClipboard(enr)
  const { onOpen } = useDisclosure()
  const disclosure = useDisclosure()
  const [modalStatus, setModal] = React.useState(false)
  const LDB = new BrowserLevel('ultralight_history', { prefix: '', version: 1 })

  function updateAddressBook() {
    const protocol = portal?.protocols.get(ProtocolId.HistoryNetwork)
    if (!protocol) return
    const known = protocol.routingTable.values()
    const formattedKnown = known!.map((_enr: ENR) => {
      const distToSelf = log2Distance(id, _enr.nodeId)
      return [
        distToSelf,
        `${_enr.ip}`,
        `${_enr.getLocationMultiaddr('udp')?.nodeAddress().port}`,
        _enr.nodeId,
        _enr.encodeTxt(),
      ]
    })
    //@ts-ignore
    const sorted = formattedKnown.sort((a, b) => a[0] - b[0]) //@ts-ignore
    const table: [number, string[]][] = sorted.map((d) => {
      return [d[0], [d[1], d[2], d[3], d[4]]]
    })
    setSortedDistList(table)
    const peers = protocol.routingTable.values()
    setPeers(peers)
  }

  async function handleClick() {
    try {
      const protocol = portal?.protocols.get(ProtocolId.HistoryNetwork)
      await protocol?.sendPing(peerEnr)
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
    try {
      node = await createNodeFromStorage()
    } catch {
      node = await createNodeFromScratch()
    }

    setPortal(node)
    node.enableLog('*discv5*, *portalnetwork*, *uTP*')
    await node.start()
    // eslint-disable-next-line no-undef
    ;(window as any).portal = node
    ;(window as any).ENR = ENR
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
    portal?.storeNodeDetails()
  }, [])

  async function handleFindContent(blockHash: string): Promise<Block | void> {
    if (portal) {
      if (blockHash.slice(0, 2) !== '0x') {
        setContentKey('')
      } else {
        const protocol = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
        if (!protocol) return
        const headerlookupKey = getHistoryNetworkContentId(1, blockHash, 0)
        const bodylookupKey = getHistoryNetworkContentId(1, blockHash, 1)
        let header: string = ''
        let body
        await protocol.historyNetworkContentLookup(0, blockHash)
        try {
          header = await portal.db.get(headerlookupKey)
        } catch (err) {
          portal.logger((err as any).message)
        }
        await protocol.historyNetworkContentLookup(1, blockHash)
        try {
          body = await portal.db.get(bodylookupKey)
        } catch (err) {
          portal.logger((err as any).message)
        }
        try {
          const block = reassembleBlock(
            fromHexString(header),
            typeof body === 'string' ? fromHexString(body) : body
          )
          setBlock(block)
          return block
        } catch (err) {
          portal.logger((err as any).message)
        }
      }
    }
  }

  async function findParent(hash: string) {
    setContentKey(hash)
    handleFindContent(hash)
    portal?.logger('Showing Block')
  }

  const openInfoMenu = () => {
    setModal(true)
    disclosure.onClose()
  }
  const invalidHash = /([^0-z])+/.test(contentKey)

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
          <Box>
            {portal && (
              <Layout
                copy={copy}
                onOpen={onOpen}
                enr={enr}
                peerEnr={peerEnr}
                setPeerEnr={setPeerEnr}
                handleClick={handleClick}
                invalidHash={invalidHash}
                handleFindContent={handleFindContent}
                contentKey={contentKey}
                setContentKey={setContentKey}
                findParent={findParent}
                block={block}
                peers={peers}
                sortedDistList={sortedDistList}
                capacitor={Capacitor}
              />
            )}
            <Button onClick={() => updateAddressBook()}>Update Address Book</Button>
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
