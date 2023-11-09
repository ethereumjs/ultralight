// import { NodeId, ENR } from '@chainsafe/discv5'
// import { ITalkReqMessage } from '@chainsafe/discv5/message'
// import { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo.js'
// import { Debugger } from 'debug'
// import { shortId, BaseNetwork, NetworkId, PortalNetwork, Bytes32TimeStamp } from '../../index.js'

// /** NOTE: This code is untested in current form and definitely DOES NOT work without more labor */
// export class Rendezvous extends BaseNetwork {
//   logger: Debugger
//   networkId: NetworkId
//   networkName: string
//   constructor(client: PortalNetwork) {
//     super(client)
//     this.networkId = NetworkId.Rendezvous
//     this.networkName = 'rendezvous'
//     this.logger = client.logger.extend('Rendezvous')
//   }

//   init(): Promise<void> {
//     return Promise.resolve()
//   }

//   public findContentLocally = async (_contentKey: Uint8Array): Promise<Uint8Array> => {
//     return Promise.resolve(Uint8Array.from([]))
//   }
//   public sendFindContent = (_dstId: string, _key: Uint8Array) => {
//     return Promise.resolve(undefined)
//   }
//   public sendRendezvous = async (dstId: NodeId, rendezvousNode: ENR, networkId: NetworkId) => {
//     const network = this.client.networks.get(networkId)
//     if (!network) throw new Error(`Network ID ${networkId} not supported`)

//     this.logger(
//       `Sending RENDEZVOUS message to ${shortId(rendezvousNode.nodeId)} for ${shortId(dstId)}`
//     )
//     const time = Bytes32TimeStamp()
//     let res = await this.client.sendPortalNetworkMessage(
//       rendezvousNode,
//       Buffer.concat([
//         Uint8Array.from([0]),
//         Buffer.from(networkId.slice(2), 'hex'),
//         Buffer.from(dstId, 'hex'),
//       ]),
//       NetworkId.Rendezvous
//     )
//     if (res.length > 0) {
//       // Measure roundtrip to `dstId`
//       const roundtrip = Bytes32TimeStamp() - time
//       const peer = ENR.decode(res)

//       //network.updateRoutingTable(peer, networkId, true)
//       setTimeout(() => network.sendPing(peer), roundtrip / 2)
//       this.logger(`Sending rendezvous DIRECT request to ${peer.nodeId}`)
//       res = await this.client.sendPortalNetworkMessage(
//         rendezvousNode,
//         Buffer.concat([
//           Uint8Array.from([1]),
//           Buffer.from(networkId.slice(2), 'hex'),
//           Buffer.from(dstId, 'hex'),
//         ]),
//         NetworkId.Rendezvous
//       )
//     }
//     this.logger(res)
//   }

//   private handleRendezvous = async (src: INodeAddress, srcId: NodeId, message: ITalkReqMessage) => {
//     const networkId = ('0x' + message.request.slice(1, 3).toString('hex')) as NetworkId
//     const network = this.client.networks.get(networkId)

//     if (!network) {
//       this.client.sendPortalNetworkResponse(src, message.id, Uint8Array.from([]))
//       return
//     }
//     switch (message.request[0]) {
//       case 0: {
//         // Rendezvous FIND request - check to see if destination node is known to us
//         const dstId = message.request.slice(3).toString('hex')
//         this.logger(
//           `Received Rendezvous FIND request for ${shortId(dstId)} on ${networkId} network`
//         )
//         let enr = network.routingTable.getWithPending(dstId)
//         if (!enr) {
//           enr = this.client.discv5.getKadValue(dstId)
//           if (!enr) {
//             // destination node is unknown, send null response
//             this.client.sendPortalNetworkResponse(src, message.id, Uint8Array.from([]))
//             return
//           }
//         }
//         // Destination node is known, send ENR to requestor
//         this.logger(`found ENR for ${shortId(dstId)} - ${enr.encodeTxt()}`)
//         const pingRes = await network.sendPing(enr)
//         // Ping target node to verify it is reachable from rendezvous node
//         if (!pingRes) {
//           // If the target node isn't reachable, send null response
//           this.client.sendPortalNetworkResponse(src, message.id, Uint8Array.from([]))
//           return
//         }
//         const payload = enr.encode()
//         this.client.sendPortalNetworkResponse(src, message.id, payload)
//         break
//       }
//       case 1: {
//         // SYNC request from requestor
//         this.client.sendPortalNetworkResponse(src, message.id, Uint8Array.from([]))
//         const dstId = message.request.slice(3).toString('hex')
//         this.logger(
//           `Received Rendezvous SYNC from requestor ${shortId(srcId)} for target ${shortId(dstId)}`
//         )
//         const srcEnr = network.routingTable.getWithPending(srcId)
//         const payload = Buffer.concat([
//           Uint8Array.from([2]),
//           Buffer.from(networkId.slice(2), 'hex'),
//           srcEnr!.encode(),
//         ])
//         // Send SYNC request to target node
//         this.logger(
//           `Forwarding Rendezvous SYNC from requestor ${shortId(srcId)} to target ${shortId(dstId)}`
//         )
//         this.client.sendPortalNetworkMessage(dstId, payload, NetworkId.Rendezvous)
//         break
//       }
//       case 2: {
//         // SYNC request from rendezvous node
//         const enr = ENR.decode(message.request.slice(3))
//         this.logger(
//           `Received Rendezvous SYNC request from ${shortId(srcId)} for requester ${shortId(
//             enr.nodeId
//           )}`
//         )
//         // Ping requestor
//         this.logger(`Sending Rendezvous Ping to requestor ${shortId(enr.nodeId)}`)
//         network.sendPing(enr)
//       }
//     }
//   }
// }
