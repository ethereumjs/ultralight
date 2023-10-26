import { execSync } from 'child_process'
import jayson, { HttpClient } from 'jayson/promise/index.js'

const { Client } = jayson

const contentKey =
  '0xb8ffc3cd6e7cf5a098a1c92f48009765b24088dcad272b45f9bf4e9ff2aa9832cdcf51288571ee0ca3bcbd041a73e61adeb2b2547ba205cbc5c4dcd6c48c7613e78d97637a082197a0829b7e8fc5d0b05a0b7471'

const content =
  '0x2400000017144556fd3424edc8fc8a4c940b2d04936d17eb0000000000000000000000000c00000080010000f3010000f9017180a0ff159d1e61f5242a84d88017baf33f1666fb372b097c3f5e68c231dec1a34af2a016d5a4dd80706fd859f90ad638ed136b441af8c4af767ad65d511c8778225dc18080a0165c9b93ace495cb76b9081facacc75c12aa05d2341a7731fc45834d744a8821a0f507e0c0d8e5c0c9b1c096288ad5ab9ee8c959dc3f04aa54d3ced6e4d056a3dda066281fb0cb9f8e39d501b372d6e24d079f99f7b79863827dc388e1245d806d87a0692c066ea2f71bee3d24a093c3f2f4deabcec5310d7fef0241bff7ed2052fd2ea0c42ea48381de9c57199a8cd341c9261f3674c67eaf7ed794f3e840a56864c571a091c281f6d9094f4245271a459f7ff9ca3d0526e7e2ab23b670b6d7c1f8a03025a0f49ab5e02ef9fd3b5b8a26ddb56a54efd8a59b59772a3760cb00203485289e6da0bc59f1e7f4f14a8f089b79d091dec5b44ceae5d84a4a66406457f654877ccf8c80a004ef8086c3f830c351ffad0ab6021cf7200933f102c86111189dc24d61b36eb28080f8718080808080a0ffbb1115c71eaf3e19e1362f958db465ccd49dbef8bc3aa3d5b6ed262ec3849da0fb4aeed8b91d4ad9a4dbf05e6cedd3940cb0ec9ea42d3196b1c9a70201ccaaa980808080a0db8149f325d7a80b38cdd58c81db5c6288a908f7d9686e06e855b93725679c488080808080f7a0208b532707259da8a2ff648515124a594268fff6ef66e594ea1261396db28767959417144556fd3424edc8fc8a4c940b2d04936d17eb'

const test = async () => {
  const cmd = 'hostname -I'
  const pubIp = execSync(cmd).toString().split(' ')
  const ip = pubIp[0]
  const ultralights: HttpClient[] = []
  const enrs: string[] = []
  const nodeIds: string[] = []
  for (let i = 0; i < 2; i++) {
    const ultralight = Client.http({ host: ip, port: 8545 + i })
    const ultralightENR = await ultralight.request('discv5_nodeInfo', [])
    ultralights.push(ultralight)
    enrs.push(ultralightENR.result.enr)
    nodeIds.push(ultralightENR.result.nodeId)
  }

  const stored = await ultralights[0].request('portal_stateStore', [contentKey, content])
  console.log({ stored })

  const retrieved = await ultralights[0].request('portal_stateLocalContent', [contentKey])
  console.log({ retrieved })

  const ping = await ultralights[0].request('portal_statePing', [enrs[1]])
  console.log({ ping })
  if (ping.result) {
    const peers = await ultralights[0].request('portal_stateRoutingTableInfo', [])
    console.log(
      'Enr Added: ',
      peers.result.buckets.flat().includes(nodeIds[1].slice(2))
        ? 'pass'
        : { expected: nodeIds[1], peers: peers.result.buckets.flat() }
    )
  }

    const findContent = await ultralights[1].request('portal_stateFindContent', [enrs[0], contentKey])
    console.log({ findContent })

//   const offerContent = await ultralights[0].request('portal_stateOffer', [
//     enrs[1],
//     contentKey,
//     content,
//   ])

//   console.log({ offerContent })

  await new Promise((res) => {
    console.log('wait')
    setTimeout(() => {
        console.log('waited')
      res(undefined)
    }, 1000)
  })

  const received = await ultralights[1].request('portal_stateLocalContent', [contentKey])
  console.log({ received })
}
test()
