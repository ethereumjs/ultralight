import * as React from 'react'
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
  HStack,
  Divider,
  Center,
  VStack,
  useToast,
} from '@chakra-ui/react'
import { log2Distance, ENR, fromHex } from '@chainsafe/discv5'
import {
  getHistoryNetworkContentId,
  PortalNetwork,
  reassembleBlock,
  SubNetworkIds,
} from 'portalnetwork'
import PeerId from 'peer-id'
import { Multiaddr } from 'multiaddr'
import { Block } from '@ethereumjs/block'
import DevTools from './Components/DevTools'
import StartNode from './Components/StartNode'
import Layout from './Components/Layout'
import { FaTools } from 'react-icons/fa'
import { Capacitor } from '@capacitor/core'
import { HamburgerIcon } from '@chakra-ui/icons'
import Footer from './Components/Footer'
// export const lightblue = '#bee3f8'
export const lightblue = theme.colors.blue[100]
export const mediumblue = theme.colors.blue[200]

export const App = () => {
  const [portal, setPortal] = React.useState<PortalNetwork>()
  const [peers, setPeers] = React.useState<ENR[] | undefined>([])
  const [sortedDistList, setSortedDistList] = React.useState<[number, string[]][]>([])
  const [enr, setENR] = React.useState<string>('')
  const [id, setId] = React.useState<string>('')
  const [peerEnr, setPeerEnr] = React.useState('')
  const [contentKey, setContentKey] = React.useState<string>(
    '0xf37c632d361e0a93f08ba29b1a2c708d9caa3ee19d1ee8d2a02612bffe49f0a9'
  )
  const [proxy, setProxy] = React.useState('ultralight.ethdevops.io')
  const [block, setBlock] = React.useState<Block>()
  const { onCopy } = useClipboard(enr)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  const init = async () => {
    if (portal?.client.isStarted()) {
      await portal.stop()
    }
    const id = await PeerId.create({ keyType: 'secp256k1' })
    const enr = ENR.createFromPeerId(id)
    setId(enr.nodeId)
    enr.setLocationMultiaddr(new Multiaddr('/ip4/127.0.0.1/udp/0'))
    const node = new PortalNetwork(
      {
        enr: enr,
        peerId: id,
        multiaddr: new Multiaddr('/ip4/104.248.102.101/udp/0'),
        transport: Capacitor.isNativePlatform() ? 'cap' : 'wss',
        proxyAddress: `ws://${proxy}`,
      },
      2n ** 256n
    )
    // eslint-disable-next-line no-undef
    ;(window as any).portal = node
    // eslint-disable-next-line no-undef
    ;(window as any).Multiaddr = Multiaddr
    // eslint-disable-next-line no-undef
    ;(window as any).ENR = ENR
    setPortal(node)
    node.client.on('multiaddrUpdated', () =>
      setENR(node.client.enr.encodeTxt(node.client.keypair.privateKey))
    )
    await node.start()
    node.enableLog('*ultralight*, *portalnetwork*, *<uTP>*, *discv5*')
  }

  const copy = async () => {
    await setENR(portal?.client.enr.encodeTxt(portal.client.keypair.privateKey) ?? '')
    onCopy()
  }

  function updateAddressBook() {
    const routingTable = portal?.routingTables.get(SubNetworkIds.HistoryNetwork)
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
    const peers = portal!.routingTables.get(SubNetworkIds.HistoryNetwork)!.values()
    setPeers(peers)
  }

  React.useEffect(() => {
    portal?.on('NodeRemoved', () => updateAddressBook())
    return () => {
      portal?.removeAllListeners()
    }
  }, [portal])

  React.useEffect(() => {
    init()
  }, [])

  async function handleClick() {
    let res
    let errMessage
    try {
      res = await portal?.sendPing(peerEnr, SubNetworkIds.HistoryNetwork)
    } catch (err) {
      if ((err as any).message.includes('verify enr signature')) {
        errMessage = 'Invalid ENR'
      }
    }
    setPeerEnr('')
    if (res) updateAddressBook()
    // Only rerender the address book if we actually got a response from the node
    else {
      if (!errMessage) {
        errMessage = 'Node did not respond'
      }
      toast({
        title: errMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  async function handleFindContent(blockHash: string): Promise<Block | void> {
    if (portal) {
      if (blockHash.slice(0, 2) !== '0x') {
        setContentKey('')
      } else {
        const headerlookupKey = getHistoryNetworkContentId(1, blockHash, 0)
        const bodylookupKey = getHistoryNetworkContentId(1, blockHash, 1)
        let header
        let body
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
        try {
          const block = reassembleBlock(
            fromHex(header.slice(2)),
            typeof body === 'string' ? fromHex(body.slice(2)) : body
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
    await setContentKey(hash)
    await handleFindContent(hash)
    portal?.logger('Showing Block')
  }

  const invalidHash = /([^0-z])+/.test(contentKey)

  return (
    <>
      <Center bg={'gray.200'}>
        <Box w={['90%', '100%']} justifyContent={'center'}>
          <HStack>
            {Capacitor.isNativePlatform() ? (
              <>
                <Button
                  // colorScheme={'facebook'}
                  leftIcon={<HamburgerIcon />}
                  // width={'20%'}
                  // onClick={onOpen}
                ></Button>
                <VStack width={'80%'}>
                  <Heading size={'2xl'} textAlign="start">
                    Ultralight
                  </Heading>
                  <Heading size={'l'} textAlign="start">
                    Portal Network Explorer
                  </Heading>
                </VStack>

                <Button colorScheme={'facebook'} leftIcon={<FaTools />} onClick={onOpen}>
                  {/* Dev Tools */}
                </Button>
              </>
            ) : (
              <>
                <Button leftIcon={<HamburgerIcon />} />
                <Heading width={'80%'} size="xl" textAlign="start">
                  Ultralight Portal Network Explorer
                </Heading>
                <Button
                  colorScheme={'facebook'}
                  leftIcon={<FaTools />}
                  width={'20%'}
                  onClick={onOpen}
                >
                  Dev Tools
                </Button>
              </>
            )}
          </HStack>
          <Divider />
        </Box>{' '}
      </Center>
      {portal && (
        <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerHeader>Dev Tools</DrawerHeader>
            <DrawerBody>
              <DevTools enr={enr} copy={copy} portal={portal} peers={peers!} />
            </DrawerBody>
            <DrawerFooter>
              <Button onClick={onClose}>CLOSE</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
      {portal ? (
        <Box>
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
        </Box>
      ) : (
        <StartNode setProxy={setProxy} init={init} />
      )}
      <Box width={'100%'} pos={'fixed'} bottom={'0'}>
        <Center>
          <Footer />
        </Center>
      </Box>
    </>
  )
}
