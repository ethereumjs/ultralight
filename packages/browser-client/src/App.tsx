import * as React from "react";
import {
  ChakraProvider,
  Box,
  Grid,
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
} from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import { ENR } from "@chainsafe/discv5";
import { PortalNetwork, SubNetworkIds } from "portalnetwork";
import PeerId from "peer-id";
import { Multiaddr } from "multiaddr";
import ShowInfo from "./Components/ShowInfo";
import AddressBookManager from "./Components/AddressBookManager";
import Log from "./Components/Log";
export const App = () => {
  const [portal, setDiscv5] = React.useState<PortalNetwork>();
  const [enr, setENR] = React.useState<string>("");
  const [network, setNetwork] = React.useState<SubNetworkIds>(
    SubNetworkIds.HistoryNetworkId
  );
  const { hasCopied, onCopy } = useClipboard(enr); // eslint-disable-line

  const init = async () => {
    const id = await PeerId.create({ keyType: "secp256k1" });
    const enr = ENR.createFromPeerId(id);
    enr.setLocationMultiaddr(new Multiaddr("/ip4/127.0.0.1/udp/0"));
    const portal = new PortalNetwork(
      {
        enr: enr,
        peerId: id,
        multiaddr: new Multiaddr("/ip4/127.0.0.1/udp/0"),
        transport: "wss",
        proxyAddress: "ws://127.0.0.1:5050",
      },
      1
    );
    //@ts-ignore
    window.portal = portal;
    //@ts-ignore
    window.Multiaddr = Multiaddr;
    //@ts-ignore
    window.ENR = ENR;
    setDiscv5(portal);
    portal.client.on("multiaddrUpdated", () =>
      setENR(portal.client.enr.encodeTxt(portal.client.keypair.privateKey))
    );
    await portal.start();

    portal.enableLog();
  };

  React.useEffect(() => {
    init();
  }, []);

  const copy = async () => {
    await setENR(
      portal?.client.enr.encodeTxt(portal.client.keypair.privateKey) ?? ""
    );
    onCopy();
  };

  const updateNetwork = (val: string) => {
    switch (val) {
      case SubNetworkIds.HistoryNetworkId:
        setNetwork(SubNetworkIds.HistoryNetworkId);
        break;
      case SubNetworkIds.StateNetworkId:
        setNetwork(SubNetworkIds.StateNetworkId);
        break;
    }
  };
  return (
    <ChakraProvider theme={theme}>
      <ColorModeSwitcher justifySelf="flex-end" />
      <HStack justifyContent={"space-between"}>
        <Flex>
          <Box width={"20%"} height="100%">
            {portal && <Log portal={portal} />}
          </Box>
          <VStack width="70%">
            <Heading textAlign="center">Ultralight Node Interface</Heading>
            <Box textAlign="center" fontSize="xl">
              {portal && <ShowInfo portal={portal} />}
              <Tooltip label="click to copy">
                <Text
                  fontSize={"1rem"}
                  onClick={copy}
                  wordBreak="break-all"
                  cursor="pointer"
                >
                  {portal?.client.enr.encodeTxt(
                    portal.client.keypair.privateKey
                  )}
                </Text>
              </Tooltip>
            </Box>
            <RadioGroup onChange={updateNetwork} value={network} spacing={1}>
              <Stack direction="row">
                <Radio value={SubNetworkIds.StateNetworkId}>
                  State Network
                </Radio>
                <Radio value={SubNetworkIds.HistoryNetworkId}>
                  History Network
                </Radio>
              </Stack>
            </RadioGroup>
            <Box>
              {portal && (
                <AddressBookManager portal={portal} network={network} />
              )}
            </Box>
          </VStack>
        </Flex>
      </HStack>
    </ChakraProvider>
  );
};
