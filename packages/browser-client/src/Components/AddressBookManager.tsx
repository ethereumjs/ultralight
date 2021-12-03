import {
  Box,
  Button,
  HStack,
  Input,
  Text,
  Wrap,
} from "@chakra-ui/react";
import { PortalNetwork } from "portalnetwork";
import React from "react";

type NodeManagerProps = {
  portal: PortalNetwork;
};

const AddressBookManager: React.FC<NodeManagerProps> = ({ portal }) => {
  const [enr, setEnr] = React.useState<string>("");
  const [peers, setPeers] = React.useState<string[]>([]);

  const handleClick = () => {
    if (enr) {
      portal.client.addEnr(enr);
      setEnr("");
      const peerENRs = portal.client.kadValues();
      const newPeers = peerENRs.map((peer) => peer.nodeId);
      setPeers(newPeers);
    }
  };

  const handlePing = (nodeId: string) => {
    portal.sendPing(nodeId);
  };

  const handleFindNodes = (nodeId: string) => {
    portal.sendFindNodes(nodeId, Uint16Array.from([0, 1, 2]));
  };

  const handleFindContent = (nodeId: string) => {
    portal.sendFindContent(nodeId, new Uint8Array(16).fill(0));
  };

  const handleOffer = (nodeId: string) => {
    portal.sendOffer(nodeId, [new Uint8Array(16).fill(0)]);
  };

  const handleUtpStream = (nodeId: string) => {
    portal.sendUtpStreamRequest(nodeId);
  };
  return (
    <Box>
      <Input
        value={enr}
        placeholder={"Node ENR"}
        onChange={(evt) => setEnr(evt.target.value)}
      ></Input>
      <Button onClick={handleClick}>Add Node</Button>
      {peers.length > 0 &&
        peers.map((peer) => (
          <HStack key={Math.random().toString()}>
            <Text>{peer.slice(10)}...</Text>
            <Wrap spacing="5px">
              <Button onClick={() => handlePing(peer)}>Send Ping</Button>
              <Button onClick={() => handleFindNodes(peer)}>
                Request Nodes from Peer
              </Button>
              <Button onClick={() => handleFindContent(peer)}>
                Send Find Content Request
              </Button>
              <Button onClick={() => handleOffer(peer)}>Send Offer</Button>
              <Button onClick={() => handleUtpStream(peer)}>
                Start uTP Stream
              </Button>
            </Wrap>
          </HStack>
        ))}
    </Box>
  );
};

export default AddressBookManager;
