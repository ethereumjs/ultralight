import * as React from 'react'
import { BrowserLevel } from 'browser-level'
import {
  theme,
  Button,
  Box,
  Center,
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
import Layout from './Components/Layout'
import { Capacitor } from '@capacitor/core'
import Footer from './Components/Footer'
import InfoMenu from './Components/InfoMenu'
import bns from './bootnodes.json'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'
import { TransportLayer } from 'portalnetwork/dist/client'
import { toHexString } from './Components/DisplayTx'
import { PortalContext, BlockContext, HistoryProtocolContext, PeersContext } from './ContextHooks'
import Header from './Components/Header'
export const lightblue = theme.colors.blue[100]
export const mediumblue = theme.colors.blue[200]

export const App = () => {
  const [portal, setPortal] = React.useState<PortalNetwork>()
  const [historyProtocol, setHistoryProtocol] = React.useState<HistoryProtocol>()
  const [peers, setPeers] = React.useState<ENR[]>([])
  const [sortedDistList, setSortedDistList] = React.useState<[number, string[]][]>([])
  const [peerEnr, setPeerEnr] = React.useState('')
  const [proxy, setProxy] = React.useState('ws://127.0.0.1:5050')
  const [block, setBlock] = React.useState<Block>(Block.prototype)
  const blockValue = React.useMemo(() => ({ block, setBlock }), [block])
  const [modalStatus, setModal] = React.useState(false)
  const LDB = new BrowserLevel('ultralight_history', { prefix: '', version: 1 })

  function updateAddressBook() {
    try {
      const known = historyProtocol!.routingTable.values()
      const formattedKnown: [number, string, string, string, string][] = known.map((_enr: ENR) => {
        const distToSelf = log2Distance(portal!.discv5.enr.nodeId, _enr.nodeId)
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

  async function connectToPeer() {
    try {
      await historyProtocol?.addBootNode(peerEnr)
      setPeerEnr('')
      updateAddressBook()
    } catch (err) {}
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
      portal?.storeNodeDetails()
    })
  }

  React.useEffect(() => {
    init()
  }, [])

  return (
    <ChakraProvider theme={theme}>
      {portal && (
        <PortalContext.Provider value={portal}>
          <Header enr={portal.discv5.enr.encodeTxt(portal.discv5.keypair.privateKey)} />
          {historyProtocol && (
            <>
              <HStack border={'1px'} width={'100%'} paddingY={1}>
                <Button width={'25%'} bgColor={'blue.100'} size={'xs'} onClick={connectToPeer}>
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
              <Divider />

              <Box>
                <HistoryProtocolContext.Provider value={historyProtocol}>
                  <PeersContext.Provider value={peers}>
                    <BlockContext.Provider value={blockValue}>
                      <Layout
                        peers={peers.length > 0}
                        refresh={updateAddressBook}
                        table={sortedDistList}
                      />
                    </BlockContext.Provider>
                  </PeersContext.Provider>
                </HistoryProtocolContext.Provider>
              </Box>
            </>
          )}
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
