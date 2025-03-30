import { spawn } from 'child_process'
import { Client } from 'jayson/promise'

export interface cliConfig {
  ip?: string
  port?: number
  rpcPort?: number
  networks?: string[]
}
export const startRpc = async (opts?: cliConfig) => {
  const ip = opts?.ip ?? '127.0.0.1'
  const port = opts?.port ?? 9090
  const rpcPort = opts?.rpcPort ?? 8545
  const networks = opts?.networks ?? ['beacon']
  const ultralight = spawn(
    'tsx',
    [
      'src/index.ts',
      `--rpcAddr=${ip}`,
      `--rpcPort=${rpcPort}`,
      `--bindAddress=${ip}:${port}`,
      `--networks=${networks.join(' ')}`,
    ],
    { stdio: ['pipe', 'pipe', 'inherit'], env: process.env },
  )
  ultralight.on('message', (msg) => {
    console.log(msg.toString())
  })
  const rpc = Client.http({ host: ip, port: opts?.rpcPort })
  let done = false
  while (!done) {
    try {
      await rpc.request(`discv5_nodeInfo`, [])
      done = true
    } catch {
      /** Catch connection errors while waiting for portal client to start */
    }
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve(undefined)
      }, 1000),
    )
  }
  return { ultralight, rpc }
}
