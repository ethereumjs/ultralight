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
  useToast,
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
export const lightblue = theme.colors.blue[100]
export const mediumblue = theme.colors.blue[200]

const bns: string[] = [
  'enr:-IS4QG_M1lzTXzQQhUcAViqK-WQKtBgES3IEdQIBbH6tlx3Zb-jCFfS1p_c8Xq0Iie_xT9cHluSyZl0TNCWGlUlRyWcFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQMo1NBoJfVY367ZHKA-UBgOE--U7sffGf5NBsNSVG629oN1ZHCCF6Q',
  'enr:-IS4QNxXp3t9TUUQCK39l1OYBYYkXoEF2ojj9bPmWqpKsSbIfw1dbsisOt9SYDD0qwNKZZ1_qWDEeEH5lo85gq-JOhEFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQKKnSTsqwcBYg1atI7dlanT8Mo29std_701sLx0g09yXYN1ZHCCF6Y',
  'enr:-IS4QD-qmTd6jsWvntSnVvqj1vK2qp8Vb-G56era8b4h_uKaRsWxTflX8-6RAaKTZKG0-obOoeHui7bFOH7LpjAdGaQFgmlkgnY0gmlwhKRc9EGJc2VjcDI1NmsxoQIHi6O5zgq55hbKqgVYsuwZNOL1nz6h4sUDCY0UEIhKEIN1ZHCCF6I',
  'enr:-IS4QJBALBigZVoKyz-NDBV8z34-pkVHU9yMxa6qXEqhCKYxOs5Psw6r5ueFOnBDOjsmgMGpC3Qjyr41By34wab1sKIBgmlkgnY0gmlwhKEjVaWJc2VjcDI1NmsxoQOSGugH1jSdiE_fRK1FIBe9oLxaWH8D_7xXSnaOVBe-SYN1ZHCCIyg',
  'enr:-IS4QFm4gtstCnRtOC-MST-8AFO-eUhoNyM0u1XbXNlr4wl1O_rGr6y7zOrS3SIZrPDAge_ijFZ4e2B9eZVHhmgJtg8BgmlkgnY0gmlwhM69ZOyJc2VjcDI1NmsxoQLaI-m2CDIjpwcnUf1ESspvOctJLpIrLA8AZ4zbo_1bFIN1ZHCCIyg',
  'enr:-IS4QBE8rpfrvCZVf0RISINpHU4GM-ZmkX4y3h_WxF7YflJ-dh88a6q9_42mGVSAetfpOQqujnPE-BkDWss5qF6d45UBgmlkgnY0gmlwhJ_fCDaJc2VjcDI1NmsxoQN9rahqamBOJfj4u6yssJQJ1-EZoyAw-7HIgp1FwNUdnoN1ZHCCIyg',
  'enr:-IS4QGeTMHteRmm-MSYniUd48OZ1M7RMUsIjnSP_TRbo-goQZAdYuqY2PyNJfDJQBz33kv16k7WB3bZnBK-O1DagvJIBgmlkgnY0gmlwhEFsKgOJc2VjcDI1NmsxoQIQXNgOCBNyoXz_7XP4Vm7pIB1Lp35d67BbC4iSlrrcJoN1ZHCCI40',
  'enr:-IS4QOA4voX3J7-R_x8pjlaxBTpT1S_CL7ZaNjetjZ-0nnr2VaP0wEZsT2KvjA5UWc8vi9I0XvNSd1bjU0GXUjlt7J0BgmlkgnY0gmlwhEFsKgOJc2VjcDI1NmsxoQI7aL5dFuHhwbxWD-C1yWH7UPlae5wuV_3WbPylCBwPboN1ZHCCI44',
  'enr:-IS4QFzPZ7Cc7BGYSQBlWdkPyep8XASIVlviHbi-ZzcCdvkcE382unsRq8Tb_dYQFNZFWLqhJsJljdgJ7WtWP830Gq0BgmlkgnY0gmlwhEFsKq6Jc2VjcDI1NmsxoQPjz2Y1Hsa0edvzvn6-OADS3re-FOkSiJSmBB7DVrsAXIN1ZHCCI40',
  'enr:-IS4QHA1PJCdmESyKkQsBmMUhSkRDgwKjwTtPZYMcbMiqCb8I1Xt-Xyh9Nj0yWeIN4S3sOpP9nxI6qCCR1Nf4LjY0IABgmlkgnY0gmlwhEFsKq6Jc2VjcDI1NmsxoQLMWRNAgXVdGc0Ij9RZCPsIyrrL67eYfE9PPwqwRvmZooN1ZHCCI44',
]

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
  // const toast = useToast()
  const [modalStatus, setModal] = React.useState(false)
  const LDB = new BrowserLevel('ultralight_history', { prefix: '', version: 1 })
  function updateAddressBook() {
    const routingTable = portal?.routingTables.get(SubprotocolIds.HistoryNetwork)
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
    // Test for Database sync
    const now = performance.now()
    console.log('from method call', now)
    LDB.put('closed', now.toString()).then(async (res) => {
      console.log('from db', await LDB.get('closed'))
    })
    // Put list of ENR's in DB
    peerEnrStrings.length > 1 &&
      LDB.put('peers', JSON.stringify(peerEnrStrings)).then(async (res) => {
        console.log(JSON.parse(await LDB.get('peers')).length)
      })
  }, [visible])
  async function handleVisibilityChange(p: PortalNetwork) {
    setVisible(document.visibilityState)
    let keys: string[] = []
    try {
      keys = JSON.parse(await LDB.get('keys'))
    } catch (err) {
      console.log((err as any).message)
      console.log('no old keys')
    }
    const stream = p.db.createReadStream()
    stream.on('data', async (data) => {
      await LDB.put(data.key, data.value)
      keys.push(data.key)
      console.log('stream friends')
    })
    stream.on('end', async () => {
      const k = Array.from(new Set(keys))
      await LDB.put('keys', JSON.stringify(k))
      console.log('closing stream. keys in db: ', k.length)
    })
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
    // toast({
    //   title: errMessage,
    //   status: 'error',
    //   duration: 3000,
    //   isClosable: true,
    // })
  }
  const init = async () => {
    try {
      console.log(await LDB.get('closed'))
    } catch {
      console.log('closing not found')
    }
    if (navigator.storage && navigator.storage.persist)
      navigator.storage.persist().then(function (persistent) {
        if (persistent) console.log('Storage will not be cleared except by explicit user action')
        else console.log('Storage may be cleared by the UA under storage pressure.')
      })
    try {
      const prev_enr_string = await LDB.get('enr')
      const prev_peerid = await LDB.get('peerid')
      const prev_keys = JSON.parse(await LDB.get('keys'))
      const prev_content: string[][] = prev_keys.map(async (k: string) => {
        try {
          const value = await LDB.get(k)
          return [k, value]
        } catch {}
      })
      const recreatedENR: ENR = ENR.decodeTxt(prev_enr_string)
      const recreatedPeerId = JSON.parse(prev_peerid)
      const prev_node = await PortalNetwork.recreatePortalNetwork(
        proxy,
        recreatedPeerId,
        recreatedENR,
        prev_content
      )
      ;(window as any).portal = prev_node
      ;(window as any).LDB = LDB
      setPortal(prev_node)
      await prev_node.start()
      // eslint-disable-next-line no-undef
      ;(window as any).ENR = ENR
      prev_node.enableLog('*ultralight*, *portalnetwork*, *<uTP>*, *discv*')
      const stream = prev_node.db.createReadStream()
      stream.on('data', async (data) => {
        await LDB.put(data.key, data.value)
        console.log('stream friends')
      })
      stream.on('close', () => {
        console.log('closing stream')
      })
      try {
        const storedPeers = await LDB.get('peers')
        let peerList: string[] = JSON.parse(storedPeers)
        peerList.push(...bns)
        console.log('found some old friends', peerList.length)
        console.log('and found bootnodes', bns.length)
        peerList = Array.from(new Set(peerList))
        console.log('rebuilding routingtable', peerList.length)
        peerList.forEach(async (peer: string) => {
          await prev_node.addBootNode(peer, SubprotocolIds.HistoryNetwork)
        })
        setENR(peerList[0])
      } catch {}
      return prev_node
    } catch (err: unknown) {
      const node = Capacitor.isNativePlatform()
        ? await PortalNetwork.createMobilePortalNetwork('0.0.0.0:0')
        : await PortalNetwork.createPortalNetwork('127.0.0.1', proxy)
      // eslint-disable-next-line no-undef
      ;(window as any).LDB = LDB
      node.client.on('multiaddrUpdated', () =>
        setENR(node.client.enr.encodeTxt(node.client.keypair.privateKey))
      )
      await LDB.batch([
        {
          type: 'put',
          key: 'enr',
          value: node.client.enr.encodeTxt(node.client.keypair.privateKey),
        },
        {
          type: 'put',
          key: 'peerid',
          value: JSON.stringify(await node.client.peerId()),
        },
      ])
      await node.start()
      const stream = node.db.createReadStream()
      stream
        .on('data', async (data) => {
          await LDB.put(data.key, data.value)
        })
        .on('error', (err) => {
          console.log('Oh my!', err)
        })
        .on('close', () => {
          console.log('Stream closed')
        })
        .on('end', () => {
          console.log('Stream ended')
          bns.forEach(async (peer: string) => {
            await node.addBootNode(peer, SubprotocolIds.HistoryNetwork)
          })
        })
      // eslint-disable-next-line no-undef
      ;(window as any).portal = node
      ;(window as any).ENR = ENR
      setPortal(node)
      node.enableLog('*ultralight*, *portalnetwork*, *<uTP>*, *discv*')
      return node
    }
  }

  const copy = async () => {
    await setENR(portal?.client.enr.encodeTxt(portal.client.keypair.privateKey) ?? '')
    onCopy()
  }

  React.useEffect(() => {
    init().then((res) => {
      document.onvisibilitychange = async () => {
        await handleVisibilityChange(res)
      }
      window.onbeforeunload = async () => {
        // Put list of ENR's in DB
        peerEnrStrings.length > 1 &&
          LDB.put('peers', JSON.stringify(peerEnrStrings)).then(async () => {
            await handleVisibilityChange(res)
          })
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
        const keys = await LDB.get('keys')
        if (keys.includes(headerlookupKey) && keys.includes(bodylookupKey)) {
          try {
            header = await LDB.get(headerlookupKey)
            body = await LDB.get(bodylookupKey)
          } catch {}
        } else {
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
              portal={portal}
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
            portal={portal}
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
            LDB={LDB}
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
    </>
  )
}
