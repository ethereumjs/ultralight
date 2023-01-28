import jayson, { HttpClient } from 'jayson/promise/index.js'


const { Client } = jayson

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
    if(!ping.result) {
      console.log('pingfail') 
    } else {
      console.log(`PING 0 <> ${idx + 2} pass`)
    }
  }
  for (const [idx, enr] of enrs.slice(2, 8).entries()) {
    const ping = await ultralights[9].request('portal_historyPing', [enr, '0x00'])
    if(!ping.result) {
      console.log('pingfail') 
    } else {
      console.log(`PING 9 <> ${idx + 2} pass`)
    }
  }
  
  const ping9 = await ultralights[1].request('portal_historyPing', [enrs[9], '0x00'])
  const find = await ultralights[0].request('portal_historyRecursiveFindNodes', [nodeIds[1]])
  console.log('RecursiveFindNodes', find.result === enrs[1] ? 'pass' : find)

}

const main = async () => {
  await recursiveFindNodes()
}

main()
