import * as React from 'react'
import {
  ChakraProvider,
  Box,
  theme,
  Heading,
  Button,
  Text,
  Tooltip,
  useClipboard,
  VStack,
  RadioGroup,
  Radio,
  Stack,
  HStack,
  Flex,
  Input,
  Center,
} from '@chakra-ui/react'
import { ColorModeSwitcher } from './ColorModeSwitcher'
import { ENR } from '@chainsafe/discv5'
import { PortalNetwork, SubNetworkIds } from 'portalnetwork'
import PeerId from 'peer-id'
import { Multiaddr } from 'multiaddr'
import ShowInfo from './Components/ShowInfo'
import AddressBookManager from './Components/AddressBookManager'
import Log from './Components/Log'
export const App = () => {
  const [portal, setDiscv5] = React.useState<PortalNetwork>()
  const [enr, setENR] = React.useState<string>('')
  const [network, setNetwork] = React.useState<SubNetworkIds>(SubNetworkIds.HistoryNetwork)
  const [radius, setRadius] = React.useState('')

  const { onCopy } = useClipboard(enr) // eslint-disable-line

  const init = async () => {
    const id = await PeerId.create({ keyType: 'secp256k1' })
    const enr = ENR.createFromPeerId(id)
    enr.setLocationMultiaddr(new Multiaddr('/ip4/127.0.0.1/udp/0'))
    const portal = new PortalNetwork(
      {
        enr: enr,
        peerId: id,
        multiaddr: new Multiaddr('/ip4/127.0.0.1/udp/0'),
        transport: 'wss',
        proxyAddress: 'ws://127.0.0.1:5050',
      },
      1
    )
    // eslint-disable-next-line no-undef
    ;(window as any).portal = portal
    // eslint-disable-next-line no-undef
    ;(window as any).Multiaddr = Multiaddr
    // eslint-disable-next-line no-undef
    ;(window as any).ENR = ENR
    setDiscv5(portal)
    portal.client.on('multiaddrUpdated', () =>
      setENR(portal.client.enr.encodeTxt(portal.client.keypair.privateKey))
    )
    await portal.start()

    portal.enableLog('portalnetwork*, <uTP>*')
  }

  React.useEffect(() => {
    init()
  }, [])

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

  const updateRadius = () => {
    let rad = portal?.radius
    try {
      rad = parseInt(radius)
      if (rad < 0) return
    } catch (err) {
      console.log(err)
      return
    }
    setRadius('')
    if (portal) portal.radius = rad
  }
  return (
    <ChakraProvider theme={theme}>
      <ColorModeSwitcher justifySelf="flex-end" />
      <HStack justifyContent={'space-between'}>
        <Flex>
          {portal && <Log portal={portal} />}
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
            <Box>
              <Center>
                <Heading paddingBottom={2} size="lg">
                  Local Node Management
                </Heading>
              </Center>
              <RadioGroup onChange={updateNetwork} value={network} spacing={1}>
                <Stack direction="row">
                  <Radio value={SubNetworkIds.StateNetwork}>State Network</Radio>
                  <Radio value={SubNetworkIds.HistoryNetwork}>History Network</Radio>
                </Stack>
              </RadioGroup>
              <HStack>
                <Input
                  w="150px"
                  placeholder="Radius"
                  value={radius}
                  onChange={(evt) => setRadius(evt.target.value)}
                />
                <Button onClick={updateRadius} disabled={!portal || !radius} w="155px">
                  Update Radius
                </Button>
              </HStack>
            </Box>
            <Box>{portal && <AddressBookManager portal={portal} network={network} />}</Box>
          </VStack>
        </Flex>
      </HStack>
    </ChakraProvider>
  )
}
