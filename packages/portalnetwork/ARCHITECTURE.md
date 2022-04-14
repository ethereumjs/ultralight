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
    sequenceDiagram
        PNMessageHandler->>sendPortalNetworkMessage: nodeId/content
        sendPortalNetworkMessage->>routingTable: nodeId
        routingTable->>sendPortalNetworkMessage: ENR
        sendPortalNetworkMessage->>discv5.TalkReqHandler: content/(nodeId or ENR)
        discv5.TalkReqHandler->>discv5.RPCHandler: encoded message
        discv5.RPCHandler->>remotePeer: encoded message
        remotePeer->>discv5.RPCHandler: encoded response
        discv5.RPCHandler->>discv5.TalkReqHandler: encoded response
        discv5.TalkReqHandler->>sendPortalNetworkMessage: TalkResp payload
        sendPortalNetworkMessage->>PNMessageHandler: decoded message
        
```