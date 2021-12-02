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
  SimpleGrid,
} from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import { ENR } from "portalnetwork-discv5";
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
    window.discv5 = portal;
    //@ts-ignore
    window.Multiaddr = Multiaddr;
    //@ts-ignore
    window.ENR = ENR;
    setDiscv5(portal);

    await portal.start();

    portal.enableLog();
    portal.client.on("discovered", (msg) => console.log("discovered", msg));
    portal.client.on("talkRespReceived", (src, enr, msg) =>
      console.log("Msg received", msg)
    );
  };

  React.useEffect(() => {
    init();
  }, []);

  const copy = async () => {
    console.log("got here!");
    await setENR(
      portal?.client.enr.encodeTxt(portal.client.keypair.privateKey) ?? ""
    );
    onCopy();
  };
  return (
    <ChakraProvider theme={theme}>
      <ColorModeSwitcher justifySelf="flex-end" />
      <Heading textAlign="center">Ultralight Node Interface</Heading>
      <SimpleGrid columns={2}>
        <Box textAlign="center" fontSize="xl">
          <Grid minH="50vh" p={3}>
            <Button disabled={!portal} onClick={() => setShowInfo(true)}>
              Click to Start
            </Button>
            {showInfo && (
              <Tooltip label="click to copy">
                <Text onClick={copy} wordBreak="break-all" cursor="pointer">
                  {portal?.client.enr.encodeTxt(
                    portal.client.keypair.privateKey
                  )}
                </Text>
              </Tooltip>
            )}
            {showInfo && portal && <ShowInfo portal={portal} />}
          </Grid>
        </Box>
        <Box>{portal && <AddressBookManager portal={portal} />}</Box>
      </SimpleGrid>
      <Box position="fixed" bottom="0">
        {portal && <Log portal={portal} />}
      </Box>
    </ChakraProvider>
  );
};
