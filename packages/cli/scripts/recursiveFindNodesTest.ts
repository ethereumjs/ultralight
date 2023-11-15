import jayson from 'jayson/promise/index.js'
import { ENR } from 'portalnetwork'

import type { HttpClient } from 'jayson/promise/index.js'

const { Client } = jayson

const findNodes = async () => {
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
  for (const [idx, enr] of enrs.slice(2).entries()) {
    const ping = await ultralights[0].request('portal_historyPing', [enr, '0x00'])
    if (ping.result === undefined) {
      console.log('pingfail')
    } else {
      console.log(`PING 0 <> ${idx + 2} pass`)
    }
  }
  const find = await ultralights[1].request('portal_historyFindNodes', [
    nodeIds[0],
    [255, 254, 253],
  ])
  console.log(
    find.result.length > 0
      ? 'portal_historyFindNodes test passed: ' + find.result.length + ' enrs found'
      : find,
  )
}
const sendFindNodes = async () => {
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
  for (const [idx, enr] of enrs.slice(2).entries()) {
    const ping = await ultralights[0].request('portal_historyPing', [enr, '0x00'])
    if (ping.result === undefined) {
      console.log('pingfail')
    } else {
      console.log(`PING 0 <> ${idx + 2} pass`)
    }
  }
  const find = await ultralights[1].request('portal_historySendFindNodes', [
    nodeIds[0],
    [255, 254, 253],
  ])
  const seq = '0x' + ENR.decodeTxt(enrs[0]).seq.toString(16)
  console.log(find.result === seq ? 'portal_historySendFindNodes test passed' : find)
}

const recursiveFindNodes = async () => {
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
  for (const [idx, enr] of enrs.slice(2).entries()) {
    const ping = await ultralights[0].request('portal_historyPing', [enr, '0x00'])
    if (ping.result === undefined) {
      console.log('pingfail')
    } else {
      console.log(`PING 0 <> ${idx + 2} pass`)
    }
  }
  for (const [idx, enr] of enrs.slice(2, 8).entries()) {
    const ping = await ultralights[9].request('portal_historyPing', [enr, '0x00'])
    if (ping.result === undefined) {
      console.log('pingfail')
    } else {
      console.log(`PING 9 <> ${idx + 2} pass`)
    }
  }

  const find = await ultralights[0].request('portal_historyRecursiveFindNodes', [nodeIds[1]])
  console.log('RecursiveFindNodes', find.result === enrs[1] ? 'pass' : find)
}

const main = async () => {
  await findNodes()
  await sendFindNodes()
  await recursiveFindNodes()
}

void main()
