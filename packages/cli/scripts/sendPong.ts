import jayson, { HttpClient } from 'jayson/promise/index.js'
import { ENR } from 'portalnetwork'

const { Client } = jayson

const historySendPong = async () => {
  const ultralights: HttpClient[] = []
  const enrs: string[] = []
  const nodeIds: string[] = []
  for (let i = 0; i < 10; i++) {
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 + i })
    const ultralightENR = await ultralight.request('portal_historyNodeInfo', [])
    ultralights.push(ultralight)
    enrs.push(ultralightENR.result.enr)
    nodeIds.push(ultralightENR.result.nodeId)
  }
  await ultralights[1].request('portal_historyPing', [enrs[0], '0x00'])
  const find = await ultralights[0].request('portal_historySendPong', [
    enrs[1],
    '0x' + ENR.decodeTxt(enrs[0]).seq.toString(16),
    '0x' + (2n ** 256n - 1n).toString(16),
  ])
  console.log('historySendPong', find.result === enrs[1] ? 'pass' : find)
}

const main = async () => {
  await historySendPong()
}

main()
