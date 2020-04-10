# discv5

A TypeScript implementation of the [DiscV5](https://github.com/ethereum/devp2p/blob/master/discv5/discv5.md) protocol

## Libp2p compatibility

![Peer Discovery Compatible](https://github.com/libp2p/js-libp2p-interfaces/raw/master/src/peer-discovery/img/badge.png)

Included is a libp2p peer-discovery compatibility module.

#### Example

```typescript
import { Discv5Discovery, ENR } from "@chainsafe/discv5";
import Libp2p from "libp2p";
import PeerInfo from "peer-info";

const myPeerInfo: PeerInfo = ...;

const bootstrapEnrs: ENR[] = [...];

const libp2p = new Libp2p({
  peerInfo: myPeerInfo,
  modules: {
    peerDiscovery: [Discv5Discovery],
  },
  config: {
    discv5: {
      enr: ENR.createFromPeerId(myPeerInfo.id),
      bindAddr: "/ip4/0.0.0.0/udp/9000",
      bootstrapEnrs: bootstrapEnrs,
    },
  },
});

```

## License

Apache-2.0
