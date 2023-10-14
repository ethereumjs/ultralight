# Portal Client UI

This package contains a React web-app that is used to render a client-agnostic UI for Portal Clients.
This is separate from the `Browser-Client` package, which runs Portal Client in the Browser.
Th UI differs from the `Browser-Client` in that the UI package has no portal-network or discv5 dependencies, and can be used to interact with any locally running Portal Client, not just Ultralight.

The React App, server, and the process by which they are started and run, are currently WIP.

The App utilizes **tRpc**, and typescript based RPC library, to communicate with the Portal Client.  The App is currently configured to communicate an Ultralight Client via a websocket connection, but this is not a requirement of the App.  Any Portal Client running on a local RPC server should be accessible in the `HTTP Client` tab.  A `WebSocket` based connection to Ultralight enables the App to receive real-time events from the Ultralight Client, allowing for additional functions not available using the JSON-RPC API alone, such as subscribing to client events.

## Running the App (Development mode)

- Install dependencies:
  - *from ultralight/*
    - run `npm i`

*optional*
- Start RPC-based portal client 
  - Default app configuration looks for http client on udp port 8545
  - for Ultralight:
    - *see ultralight/packages/CLI/README.md*
  - for Fluffy:
    - *see Fluffy README.md*
  - for Trin:
    - *see Trin README.md*


- Start the **tRpc server**:
  - *from ultralight/packages/CLI/:*
    - run `npm run server:dev`
  - Currently configured to also start Ultralight instance on udp PORT 8656
  - At time of writing, this server is prone to crashing if an error occurs in the client, and will need to be restarted manually.

- Start the App server:
  - *from ultralight/packages/ui/*
    - run `npm run dev`
  - serves the app on http://localhost:3000
  - default app configuration also starts websocket server on http://ws.localhost:3001

- Open Browser to http://localhost:3000
  - WS Client tab interacts with websocket client
    - By default all available event subscriptions are enabled.
  - HTTP Client tab interacts with http client
    - Manually change IP/PORT in Browser to connect to different clients

Clients under both tabs will automatically ping a hardcoded set of Bootnodes and begin to populate their routing tables when the App starts.  There is often an initial latency period before the updated routing table appears in the UI.  Logging in the browser console will also provide some feedback on the status of the client.

## App Features

### Routing Table

The Routing Table tab is a visual representation of the client's routing table, and uses a combination of RPC-methods to access detailed info about each peer.  The table is updated in real-time as the client's routing table changes, and is sortable by client type, enr, nodeId, address, and distance.

### Bootnode Responses

The Bootnodes tab displays the reponses from the Clients' initial attempt to reach the public bootnodes.

### PING/PONG

The Ping/Pong tab provides an AutoComplete input field to select a peer from the client's routing table, and then sends a PING request to that peer.  The response is displayed in the UI.  The PING/PONG is the most basic exchange that peers can use to establish a connection, or to test the status of an existing connection.

### STATEROOT

The StateRoot tab follows the tip of the chain using the Beacon Light Protocol

### PEER_LOGS (WebSocket only)

Peer Logs displays the history of incoming and outgoing messages for each Peer organized by message type.  Individual peer histories can be viewed by clicking on the peer's enr in the Routing Table.  Current implementation simply tallies the number of messages of each type sent to and from each peer, though more detailed information could be collected in this manner.

### CONTENT_STORE

Content Store provides an interface to store, retrieve, and view content from the Client's local DataBase.  Serialized content is parsed into visual components for BlockHeader / Proof/ Block Body, etc.  Newly stored keys are automatically added to the dropdown menu for easy retrieval.

### RPC

The RPC Tab provides access to the rest of the Portal JSON-RPC methods.  Users can select a method, and be provided with a form to enter the correct parameters, and send an RPC request with validated parameters.  Both the outgoing request and the incoming response are displayed in the UI as well as the browser console.

## Contributions

Contributions are welcome.  Please open an issue to discuss any changes you would like to make.

Desired contributions include:
  - Error handling / Server stability
  - Implement tRpc procedures for remaining RPC methods
  - Testing / Debugging / User Feedback
  - Visualizations / Data Analysis components
  - UI / UX / Interactivity improvements