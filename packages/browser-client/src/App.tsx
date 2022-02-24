import * as React from 'react'
import {
  ChakraProvider,
  Box,
  Flex,
  theme,
  Heading,
  Text,
  Tooltip,
  useClipboard,
  VStack,
  RadioGroup,
  Radio,
  Stack,
  Input,
  Button,
  Grid,
  GridItem,
} from '@chakra-ui/react'
import { ColorModeSwitcher } from './ColorModeSwitcher'
import { ENR } from '@chainsafe/discv5'
import { PortalNetwork, SubNetworkIds } from 'portalnetwork'
import PeerId from 'peer-id'
import { Multiaddr } from 'multiaddr'
import ShowInfo from './Components/ShowInfo'
import AddressBookManager from './Components/AddressBookManager'
import FindContent from './Components/FindContent'
import { Block } from '@ethereumjs/block'
import DisplayBlock from './Components/DisplayBlock'
export const App = () => {
  const [portal, setPortal] = React.useState<PortalNetwork>()
  const [enr, setENR] = React.useState<string>('')
  const [network, setNetwork] = React.useState<SubNetworkIds>(SubNetworkIds.HistoryNetwork)
  const [proxy, setProxy] = React.useState('127.0.0.1')
  const [finding, _setFinding] = React.useState<string>()
  const [block, setBlock] = React.useState<Block>()
  const { onCopy } = useClipboard(enr)

  const init = async () => {
    if (portal?.client.isStarted()) {
      await portal.stop()
    }
    const id = await PeerId.create({ keyType: 'secp256k1' })
    const enr = ENR.createFromPeerId(id)
    enr.setLocationMultiaddr(new Multiaddr('/ip4/127.0.0.1/udp/0'))
    const node = new PortalNetwork(
      {
        enr: enr,
        peerId: id,
        multiaddr: new Multiaddr('/ip4/127.0.0.1/udp/0'),
        transport: 'wss',
        proxyAddress: `ws://${proxy}:5050`,
      },
      2n ** 256n
    )
    // eslint-disable-next-line no-undef
    ;(window as any).portal = portal
    // eslint-disable-next-line no-undef
    ;(window as any).Multiaddr = Multiaddr
    // eslint-disable-next-line no-undef
    ;(window as any).ENR = ENR
    setPortal(node)
    node.client.on('multiaddrUpdated', () =>
      setENR(node.client.enr.encodeTxt(node.client.keypair.privateKey))
    )
    await node.start()

    node.enableLog()
  }

  const stopNode = async () => {
    await portal?.stop()
    setPortal(undefined)
  }
  const copy = async () => {
    await setENR(portal?.client.enr.encodeTxt(portal.client.keypair.privateKey) ?? '')
    onCopy()
  }

  const updateNetwork = (val: string) => {
    switch (val) {
      case SubNetworkIds.HistoryNetwork:
        setNetwork(SubNetworkIds.HistoryNetwork)
        break
      case SubNetworkIds.StateNetwork:
        setNetwork(SubNetworkIds.StateNetwork)
        break
    }
  }

  return (
    <ChakraProvider theme={theme}>
      <ColorModeSwitcher justifySelf="flex-end" />
      <Flex justify="center">
        <VStack width="70%">
          <Heading textAlign="center">Ultralight Node Interface</Heading>
          <Box textAlign="center" fontSize="xl">
            {portal && <ShowInfo portal={portal} />}
            <Tooltip label="click to copy">
              <Text fontSize={'1rem'} onClick={copy} wordBreak="break-all" cursor="pointer">
                {portal?.client.enr.encodeTxt(portal.client.keypair.privateKey)}
              </Text>
            </Tooltip>
          </Box>
          <VStack justify="center">
            <Heading paddingBottom={2} size="lg">
              Local Node Management
            </Heading>
            <Stack direction="row">
              <Input
                onChange={(evt) => {
                  setProxy(evt.target.value)
                }}
                defaultValue={'127.0.0.1'}
                placeholder="Proxy IP Address"
              />
              {portal ? (
                <Button onClick={stopNode}>Stop Node</Button>
              ) : (
                <Button onClick={init}>Start Node</Button>
              )}
            </Stack>
            <RadioGroup onChange={updateNetwork} value={network}>
              <Stack direction="row">
                <Radio value={SubNetworkIds.StateNetwork}>State Network</Radio>
                <Radio value={SubNetworkIds.HistoryNetwork}>History Network</Radio>
              </Stack>
            </RadioGroup>
            <Grid columnGap={4} templateColumns={'2'}>
              <GridItem>
                {portal && (
                  <AddressBookManager finding={finding} portal={portal} network={network} />
                )}
              </GridItem>
              <GridItem colStart={2}>
                {portal && (
                  <FindContent
                    setBlock={setBlock}
                    portal={portal}
                    finding={finding}
                    network={network}
                  />
                )}
              </GridItem>
            </Grid>
          </VStack>
          {portal && block && <DisplayBlock block={block!} />}
        </VStack>
      </Flex>
    </ChakraProvider>
  )
}
