# Ultralight Browser Node

This is a proof of concept that will start Ultralight in the browser that leverages a UDP proxy service to connect to other nodes in the discv5 network
## Usage

Run `npm run install-proxy` to install the UDP proxy

Run `npm run run-proxy` to run the proxy. Optionally pass in your IP address as the first parameter (i.e. `npm run run-proxy -- 192.168.0.100`).  Not doing may prevent other nodes from initiating connections with your client.

Run `npx ts-node src/index.ts` to start the UDP proxy

Clone this repo and install deps.

`npm run start` to start the node.

The `discv5` object is exposed in the browser console and can be used to experiment with discv5 network connectivity.

## Example Discv5 API calls

* `discv5.addEnr("enr:-IS4QOw66SDvvI74NUImT3LaeXtSBspNaFIku6t33bm8PXx0HcZu1yrLRCOvIcxVaB-gyRWM06iZlqcYnCD65IyVw7kBgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQNBJfNin_FrzGdqawimygn5j8eq4kOkZuVDIN6-c4XSB4N1ZHCCIzE")` -- adds a node ENR to the local node's address book
* `discv5.broadcastTalkReq("portal-state","0xabcx...").then((res) => console.log(res))` - notionally queries the portal network for a piece of content - will send the TALKREQ message to every peer in the address book
* `discv5.findNode("fb395a91bbd03336c14bd25673bb8f1f2ef89e181e130d7d3244fe837542da9a"))` - queries all peers in the address book for the ENR for the `nodeId` specified in the function call



