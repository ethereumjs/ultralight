# Portalnetwork Module Architecture

The `portalnetwork` module is broken down into several components that all work together to produce a usable Portal Network client.

## Main Dependency Flow

```mermaid
    graph TD
        discv5--TALKREQ/TALKRESP --> client
        client--TALKREQ/TALKRESP --> discv5
        client --> uTP
        uTP --> client
```

## Portal Network message flows
```mermaid
  graph LR
  PING --> PONG
  FINDNODES --> NODES
  FINDCONTENT --> FOUNDCONTENT
  FOUNDCONTENT --> uTP
  FOUNDCONTENT --> ENRs
  FOUNDCONTENT --> content
  OFFER --> ACCEPT
  ACCEPT --> uTP

```

## Content Lookup

```mermaid
    graph TD
        startLookup--get nearest nodes --> lookupPeers
        lookupPeers--get nearest node--> nearestPeer
        subgraph singleLookup
        nearestPeer --> sendFindContent
        sendFindContent --> enrs
        sendFindContent --> uTP
        sendFindContent --> content
        end
        enrs--add nodes to lookupPeers--> lookupPeers
```

## Portal Network Message Lifecycle
```mermaid
    graph TD
        subgraph PortalNetwork
        PING/FINDNODES/FINDCONTENT/OFFER--nodeId/content --> sendPortalNetworkMessage
        sendPortalNetworkMessage--retrieve ENR --> routingTable
        routingTable--ENR --> sendPortalNetworkMessage
        sendPortalNetworkMessage --> PONG/NODES/FOUNDCONTENT/ACCEPT
        end
        subgraph Discv5
                sendPortalNetworkMessage--content and nodeId/enr --> discv5.sendTalkReq
        discv5.sendTalkReq --> discv5.sendRPCMessage
        discv5.sendRPCMessage--encoded TalkReq message --> remotePeer
        remotePeer--encoded TalkResp --> discv5.handleTalkResp
        discv5.handleTalkResp--TalkResp payload--> sendPortalNetworkMessage
        end
        
```