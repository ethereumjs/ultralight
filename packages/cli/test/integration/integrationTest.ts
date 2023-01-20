import tape from 'tape'
import { spawn, execSync, ChildProcessByStdio, ChildProcessWithoutNullStreams } from 'child_process'
import { createRequire } from 'module'
import jayson from 'jayson/promise/index.js'

const require = createRequire(import.meta.url)

const privateKeys = [
  '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  '0x0a27002508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd743764122508021221039909a8a7e81dbdc867480f0eeb7468189d1e7a1dd7ee8a13ee486c8cbd7437641a2408021220c6eb3ae347433e8cfe7a0a195cc17fc8afcd478b9fb74be56d13bccc67813130',
]

export const end = async (p: ChildProcessWithoutNullStreams[], st: tape.Test) => {
  p[0].stdout.removeAllListeners()
  p[1].stdout.removeAllListeners()
  p[0].kill('SIGINT')
  p[1].kill('SIGINT')
  st.end()
}

export const setupNetwork = async () => {
  const cmd = 'hostname -I'
  const pubIp = execSync(cmd).toString().split(' ')
  const ip = pubIp[0]
  const portal1 = jayson.Client.http({ host: ip, port: 8545 })
  const portal2 = jayson.Client.http({ host: ip, port: 8546 })
  return [portal1, portal2]
}

export type TestFunction = (
  portal1: jayson.Client,
  portal2: jayson.Client,
  p1: ChildProcessWithoutNullStreams,
  p2: ChildProcessWithoutNullStreams
) => Promise<void>

export async function connectAndTest(
  t: tape.Test,
  st: tape.Test,
  testFunction: TestFunction,
  ends?: boolean
) {
  const cmd = 'hostname -I'
  const pubIp = execSync(cmd).toString().split(' ')
  const ip = pubIp[0]
  const file = require.resolve(process.cwd() + '/dist/index.js')
  const p1 = spawn(process.execPath, [file, `--pk=${privateKeys[0]}`, `--rpcPort=8545`], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const p2 = spawn(process.execPath, [file, `--pk=${privateKeys[1]}`, `--rpcPort=8546`], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const nodes = await setupNetwork()
  const portal1: jayson.Client = nodes[0]
  const portal2: jayson.Client = nodes[1]
  await testFunction(portal1, portal2, p1, p2)
  if (!ends) {
    await end([p1, p2], st)
  }
}
