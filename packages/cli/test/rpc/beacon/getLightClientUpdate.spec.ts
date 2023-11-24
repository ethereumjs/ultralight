import { spawn } from 'child_process'
import jayson, { Client } from 'jayson/promise/index.js'
import { assert, describe, it } from 'vitest'
const method = 'beacon_getLightClientUpdate'
describe(`${method} tests`, () => {
  it('should retrieve a light client update', async () => {
    const ip = '127.0.0.1'
    const port = 9090
    const rpcPort = 8545
    const networks = ['beacon']
    const child = spawn(
      process.execPath,
      [
        '--loader',
        'ts-node/esm',
        '../../src/index.ts',
        `--rpcAddr=${ip}`,
        `--rpcPort=${rpcPort}`,
        `--bindAddress=${ip}:${port}`,
        ...networks,
      ],
      //    { stdio: ['pipe', 'pipe', process.stderr] },
    )
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve(undefined)
      }, 10000),
    )
    const ultralight = Client.http({ host: ip, port: 8545 })
    const res = await ultralight.request(`discv5_nodeInfo`, [])
    console.log(res)
    child.kill(9)
  })
})
