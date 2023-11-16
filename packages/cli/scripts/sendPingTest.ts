import jayson from 'jayson/promise/index.js'
import { ENR } from 'portalnetwork'

import type { HttpClient } from 'jayson/promise/index.js'

const { Client } = jayson

const gossip = async () => {
  const ultralights: HttpClient[] = []
  const enrs: string[] = []
  for (let i = 0; i < 10; i++) {
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 + i })
    const ultralightENR = await ultralight.request('portal_historyNodeInfo', [])
    ultralights.push(ultralight)
    enrs.push(ultralightENR.result.enr)
  }
  // portal_historySendPing
  for (const enr of enrs.slice(1)) {
    const ping = await ultralights[0].request('portal_historySendPing', [enr, '0x00'])
    console.log(
      ping.result === '0x' + ENR.decodeTxt(enrs[0]).seq.toString(16)
        ? 'SendPing OK'
        : 'SendPing Failed',
    )
  }
}

const main = async () => {
  await gossip()
}

void main()
