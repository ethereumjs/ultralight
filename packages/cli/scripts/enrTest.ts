import jayson, { HttpClient } from 'jayson/promise/index.js'

const { Client } = jayson

const enr = async () => {
  const ultralights: HttpClient[] = []
  const enrs: string[] = []
  const nodeIds: string[] = []
  for (let i = 0; i < 10; i++) {
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 + i })
    const ultralightENR = await ultralight.request('portal_historyNodeInfo', [])
    ultralights.push(ultralight)
    // console.log(ultralightENR)
    enrs.push(ultralightENR.result.enr)
    nodeIds.push(ultralightENR.result.nodeId)
  }

  // Add/Get/Delete ENRTest
  const add = await ultralights[0].request('portal_historyAddEnr', [enrs[1]])
  console.log('portal_historyAddEnr', add.result ? 'pass' : 'fail')
  const get = await ultralights[0].request('portal_historyGetEnr', [nodeIds[1]])
  console.log('portal_historyGetEnr', get.result === enrs[1] ? 'pass' : 'fail')
  const ping = await ultralights[0].request('portal_historyPing', [enrs[1], '0x00'])
  if (ping.result) {
    const peers = await ultralights[0].request('portal_historyRoutingTableInfo', [])
    console.log('Enr Added: ', peers.result.buckets.flat().includes(nodeIds[1]) ? 'pass' : 'fail')
    // setTimeout(async () => {
    // }, 2000)
    const del = await ultralights[0].request('portal_historyDeleteEnr', [nodeIds[1]])
    console.log('portal_historyDeleteEnr', del.result ? 'pass' : 'fail')
    setTimeout(async () => {}, 3000)
    const _peers = await ultralights[0].request('portal_historyRoutingTableInfo', [])
    console.log(
      'Enr Deleted: ',
      _peers.result.buckets.flat().includes(nodeIds[1]) ? 'fail' : 'pass'
    )
    setTimeout(async () => {}, 4000)
  }
}

const main = async () => {
  await enr()
}

main()
