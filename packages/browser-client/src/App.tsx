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
} from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import { ENR } from "@chainsafe/discv5";
import { PortalNetwork } from "portalnetwork";
import PeerId from "peer-id";
import { Multiaddr } from "multiaddr";
import ShowInfo from "./Components/ShowInfo";
import AddressBookManager from "./Components/AddressBookManager";
import Log from "./Components/Log";
export const App = () => {
  const [portal, setDiscv5] = React.useState<PortalNetwork>();
  const [enr, setENR] = React.useState<string>("");
  const [showInfo, setShowInfo] = React.useState(false);
  const { hasCopied, onCopy } = useClipboard(enr); // eslint-disable-line

  const init = async () => {
    const id = await PeerId.create({ keyType: "secp256k1" });
    const enr = ENR.createFromPeerId(id);
    enr.setLocationMultiaddr(new Multiaddr("/ip4/127.0.0.1/udp/0"));
    const portal = new PortalNetwork({
      enr: enr,
      peerId: id,
      multiaddr: new Multiaddr("/ip4/127.0.0.1/udp/0"),
      transport: "wss",
      proxyAddress: "ws://127.0.0.1:5050",
    });
    //@ts-ignore
    window.portal = portal;
    //@ts-ignore
    window.Multiaddr = Multiaddr;
    //@ts-ignore
    window.ENR = ENR;
    setDiscv5(portal);

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
  return (
    <ChakraProvider theme={theme}>
      <ColorModeSwitcher justifySelf="flex-end" />
      <Heading textAlign="center">Ultralight Node Interface</Heading>
      <VStack>
        <Box textAlign="center" fontSize="xl">
          <Button disabled={!portal} onClick={() => setShowInfo(!showInfo)}>
            {!showInfo ? "Show" : "Hide"} node info
          </Button>
          {showInfo && (
            <Tooltip label="click to copy">
              <Text onClick={copy} wordBreak="break-all" cursor="pointer">
                {portal?.client.enr.encodeTxt(portal.client.keypair.privateKey)}
              </Text>
            </Tooltip>
          )}
          {showInfo && portal && <ShowInfo portal={portal} />}
        </Box>
        <Box>{portal && <AddressBookManager portal={portal} />}</Box>
      </VStack>
      <Box position="fixed" bottom="0">
        {portal && <Log portal={portal} />}
      </Box>
    </ChakraProvider>
  );
};
