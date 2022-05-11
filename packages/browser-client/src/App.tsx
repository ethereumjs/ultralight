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
} from '@chakra-ui/react'
import {
  getHistoryNetworkContentId,
  PortalNetwork,
  reassembleBlock,
  SubprotocolIds,
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
export const lightblue = theme.colors.blue[100]
export const mediumblue = theme.colors.blue[200]
export const PortalContext = React.createContext(PortalNetwork.prototype)

export const App = () => {
  const [visible, setVisible] = React.useState('visible')
  const [portal, setPortal] = React.useState<PortalNetwork>()
  const [peers, setPeers] = React.useState<ENR[]>([])
  const [peerEnrStrings, setPeerEnrStrings] = React.useState<string[]>([])
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
    const routingTable = portal?.routingTables.get(SubprotocolIds.HistoryNetwork)
    if (!routingTable) return
    const known = routingTable?.values()
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
    const peers = portal!.routingTables.get(SubprotocolIds.HistoryNetwork)!.values()
    const peerEnrStrings = peers.map((peer) => {
      return peer.encodeTxt()
    })
    setPeerEnrStrings(peerEnrStrings)
    setPeers(peers)
  }

  React.useEffect(() => {
    // Put list of ENR's in DB
    try {
      peerEnrStrings.length > 1 && LDB.put('peers', JSON.stringify(peerEnrStrings))
    } catch {}
  }, [visible])

  async function handleVisibilityChange() {
    setVisible(document.visibilityState)
  }

  async function handleClick() {
    let errMessage
    try {
      await portal?.sendPing(peerEnr, SubprotocolIds.HistoryNetwork)
    } catch (err) {
      if ((err as any).message.includes('verify enr signature')) {
        errMessage = 'Invalid ENR'
      }
    }
    setPeerEnr('')
    updateAddressBook()
    // Only rerender the address book if we actually got a response from the node

    if (!errMessage) {
      errMessage = 'Node did not respond'
    }
  }

  async function createNodeFromScratch(): Promise<PortalNetwork> {
    const node = Capacitor.isNativePlatform()
      ? await PortalNetwork.createMobilePortalNetwork(bns, '0.0.0.0:0')
      : // @ts-ignore
        await PortalNetwork.createPortalNetwork(proxy, bns, LDB)
    // eslint-disable-next-line no-undef
    ;(window as any).LDB = LDB
    node.client.on('multiaddrUpdated', () =>
      setENR(node.client.enr.encodeTxt(node.client.keypair.privateKey))
    )
    await node.start()
    // eslint-disable-next-line no-undef
    ;(window as any).portal = node
    ;(window as any).ENR = ENR
    setPortal(node)
    node.enableLog('*ultralight*, *portalnetwork*, *<uTP>*, *discv*')
    return node
  }

  async function createNodeFromStorage(): Promise<PortalNetwork> {
    // @ts-ignore
    const prev_node = await PortalNetwork.recreatePortalNetwork(proxy, LDB)
    ;(window as any).portal = prev_node
    ;(window as any).LDB = LDB
    setPortal(prev_node)
    await prev_node.start()
    // eslint-disable-next-line no-undef
    ;(window as any).ENR = ENR
    prev_node.enableLog('*ultralight*, *portalnetwork*, *<uTP>*, *discv*')
    return prev_node
  }

  const init = async () => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist()
    }
    try {
      const prev_node = await createNodeFromStorage()
      return prev_node
    } catch {
      const fresh_node = await createNodeFromScratch()
      return fresh_node
    }
  }

  const copy = async () => {
    await setENR(portal?.client.enr.encodeTxt(portal.client.keypair.privateKey) ?? '')
    onCopy()
  }

  React.useEffect(() => {
    init().then((res) => {
      document.onvisibilitychange = async () => {
        await handleVisibilityChange()
      }
      window.onbeforeunload = async () => {
        const routingTable = res.routingTables.get(SubprotocolIds.HistoryNetwork)
        const peers = routingTable?.values().map((enr) => {
          return enr.encodeTxt()
        })
        await res.db.put('peers', JSON.stringify(peers))
        await handleVisibilityChange()
      }
    })
  }, [])

  async function handleFindContent(blockHash: string): Promise<Block | void> {
    if (portal) {
      if (blockHash.slice(0, 2) !== '0x') {
        setContentKey('')
      } else {
        const headerlookupKey = getHistoryNetworkContentId(1, blockHash, 0)
        const bodylookupKey = getHistoryNetworkContentId(1, blockHash, 1)
        let header: string = ''
        let body
        try {
          header = await LDB.get(headerlookupKey)
          body = await LDB.get(bodylookupKey)
          const block = reassembleBlock(fromHexString(header), fromHexString(body))
          setBlock(block)
          return block
        } catch {
          await portal.historyNetworkContentLookup(0, blockHash)
          try {
            header = await portal.db.get(headerlookupKey)
          } catch (err) {
            portal.logger((err as any).message)
          }
          await portal.historyNetworkContentLookup(1, blockHash)
          try {
            body = await portal.db.get(bodylookupKey)
          } catch (err) {
            portal.logger((err as any).message)
          }
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
    <>
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
    </>
  )
}
