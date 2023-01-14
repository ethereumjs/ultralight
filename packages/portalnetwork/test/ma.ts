import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { ENR } from '@chainsafe/discv5'
const main = async () => {
  const pid = await createSecp256k1PeerId()
  const enr = ENR.createFromPeerId(pid)
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9999')
  enr.setLocationMultiaddr(ma)
  const p = { codes: ma.protoCodes(), names: ma.protoNames(), protos: ma.protos() }
  console.log(p)
  console.log(ma.toString())
  console.log(await enr.getFullMultiaddr('tcp'))
  console.log(enr.getLocationMultiaddr('tcp'))
  //   console.log(await enr.peerId())
  //   console.log(await enr.getFullMultiaddr('udp'))
}

main()
