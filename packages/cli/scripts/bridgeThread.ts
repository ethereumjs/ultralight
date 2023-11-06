import { hideBin } from 'yargs/helpers'
import yargs from 'yargs'
import { Alchemy, Network } from 'alchemy-sdk'
import EventEmitter from 'events'
import jayson from 'jayson/promise/index.js'
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import { execSync } from 'child_process'
import { testClients } from './setupNodes.js'
import { distance, toHexString } from 'portalnetwork'
import { decodeStateNetworkContentKey, fromHexString } from 'portalnetwork'

const bridgeThread = async () => {
  const args = await yargs(hideBin(process.argv))
    .option('KEY', {
      describe: 'alchemy api key',
      string: true,
      default: 'JY46MOVpzcwZYEln86fa44MHIks4OoSl',
      optional: true,
    })
    .option('devnet', {
      describe: 'running portal state network devnet',
      boolean: true,
      default: false,
      optional: true,
    })
    .option('numNodes', {
      description: 'number of nodes in devnet',
      number: true,
      default: 1,
      optional: true,
    })
    .option('host', {
      description: 'ip address of devnet',
      string: true,
      optional: true,
    })
    .option('port', {
      description: 'starting port number',
      number: true,
      default: 8545,
      optional: true,
    })
    .option('memory', {
      description: 'memory type',
      string: true,
      default: 'remember',
      optional: true,
    })
    .strict().argv
  const alchemyAPIKey = process.env.ALCHEMY_API_KEY
  const alchemyHTTP = jayson.Client.https({
    host: 'eth-mainnet.g.alchemy.com',
    path: `/v2/${alchemyAPIKey}`,
  })

  const cmd = 'hostname -I'
  const pubIp = execSync(cmd).toString().split(' ')
  args.host = args.host ?? pubIp[0]

  const processing: Set<string> = new Set()
  const processed: Set<string> = new Set()
  const started: Map<string, any[]> = new Map()
  const progress: Map<string, any[]> = new Map()
  const results: Map<string, any[]> = new Map()

  const getMissed = new EventEmitter()

  const numbers: boolean[] = []
  let starting: string
  const begin = process.hrtime()
  // const memory = !args.devnet ? 'remember' : args.numNodes > 2 ? 'gossip' : 'store'
  const memory = args.memory
  const ports = Array.from({ length: args.numNodes }, (_, i) => args.port + i)
  let current = 0
  const currentPort = () => {
    switch (memory) {
      case 'remember':
        return undefined
      case 'store':
        return ports[0]
      case 'gossip':
        const port = ports[current]
        current++
        if (current >= ports.length) {
          current = 0
        }
        return port
    }
  }

  const clients = await testClients(3)
  let c: any
  let nets = 0
  let a = 0
  let s = 0
  let b = 0
  let o = 0
  const testKeys: Record<string, string[]> = Object.fromEntries(
    Object.keys(clients).map((k) => [k, []]),
  )
  const workerTask = async (blockTag: string | number = 'latest') => {
    const start = process.hrtime()
    const latest = await alchemyHTTP.request('eth_getBlockByNumber', [blockTag, true])
    if (progress.has(latest.result.number)) {
      return
    }
    progress.set(latest.result.number, [''])
    results.set(latest.result.number, [''])
    started.set(latest.result.number, [start[0] - begin[0], start[1] - begin[1]])
    const idx = parseInt(latest.result.number, 16) - parseInt(starting, 16)
    if (!starting) {
      numbers[0] = true
      starting = latest.result.number
    } else if (!numbers[idx]) {
      numbers[idx] = true
      if (!numbers[idx - 1]) {
        process.stdout.cursorTo(0, 7)
        console.log(`getting missed block`, idx - 1 + parseInt(starting, 16))
        getMissed.emit('getMissed', idx - 1 + parseInt(starting, 16))
      }
    }
    processing.add(latest.result.number)
    const worker = new Worker('./scripts/stateBridge.ts', {
      execArgv: ["--loader", "ts-node/esm"],

      workerData: { latest, KEY: args.KEY, host: args.host, port: currentPort(), memory },
    })
    let distances: any[] = [
      [0, -1],
      [1, -1],
      [2, -1],
    ]
    worker.on('message', async (msg) => {
      let row = 6
      if (msg.startsWith('getProof')) {
        const p = msg.split('/')
        const percent = (p[1] / p[2]) * 100
        progress.set(latest.result.number, [
          `|${'/'.repeat(Math.floor(percent / 4))}${'_'.repeat(25 - Math.floor(percent / 4))}|`,
          percent.toFixed(2),
          `% `,
        ])
      } else if (msg.startsWith('results')) {
        const r = msg.split('/')
        results.set(latest.result.number, r.slice(1))
      } else if (msg.startsWith('network')) {
        nets++
        const [_, contentId, contentKey, content] = msg.split('/')
        distances = []
        for (const nodeId of Object.keys(clients)) {
          try {
            distances.push([nodeId, distance(BigInt(contentId), BigInt(nodeId))])
          } catch (err: any) {
            throw new Error(
              `contentKey: ${contentKey} -- Error processing distance for nodeId ${nodeId} + contentId ${contentId}: ${err.message}`,
            )
          }
        }

        try {
          distances = Object.keys(clients).map((nodeId) => [
            nodeId,
            distance(BigInt(contentId), BigInt(nodeId)),
          ])
        } catch (err: any) {
          throw new Error(
            `Error processing distance for nodeIds: ${Object.keys(
              clients,
            )} for contentId ${contentId}: ${err.message}`,
          )
        }
        const closest = Object.keys(clients)
          .sort((a, b) =>
            Number(distance(BigInt(contentId), BigInt(a)) - distance(BigInt(contentId), BigInt(b))),
          )
          .slice(0, 2)
        const type = fromHexString(contentKey)[0]
        for (const client of closest) {
          testKeys[client].push(contentKey)
        }
        try {
          if (type === 2) {
            b++
            for (const client of closest) {
              clients[client].processContractBytecode(
                fromHexString(contentKey),
                fromHexString(content),
              )
            }
          } else if (type === 1) {
            s++
            for (const client of closest) {
              clients[client].processContractStorageProof(
                fromHexString(contentKey),
                fromHexString(content),
              )
            }
          } else if (type === 0) {
            a++
            for (const client of closest) {
              clients[client].processAccountTrieProof(
                fromHexString(contentKey),
                fromHexString(content),
              )
            }
          } else {
            o++
          }
        } catch (err: any) {
          throw new Error(`Error processing content for contentKey ${contentKey}: ${err.message}`)
        }
      } else {
        //
      }
    })
    worker.on('error', (err) => console.error(err.message))
    worker.on('exit', (code) => {
      const finished = process.hrtime(start)
      processing.delete(latest.result.number)
      processed.add(latest.result.number)
      progress.set(latest.result.number, [`Finished in`, finished[0], 's'])
    })
  }

  const testResults: Record<string, [string, string | boolean][]> = Object.fromEntries(
    Object.keys(clients).map((k) => [k, []]),
  )
  const tested: Record<string, [string, string | boolean][]> = Object.fromEntries(
    Object.keys(clients).map((k) => [k, []]),
  )
  const passing: Record<
    string,
    {
      accounts: number
      storage: number
      bytecode: number
    }
  > = Object.fromEntries(
    Object.keys(clients).map((k) => [k, { accounts: 0, storage: 0, bytecode: 0 }]),
  )

  const runTest = async () => {
    for await (const [nodeId, client] of Object.entries(clients)) {
      const results: [string, boolean | string][] = []
      const resultsData: any = {}
      let pass = 0
      for await (const testKey of testKeys[nodeId]) {
        try {
          await client.compareContent(fromHexString(testKey))
          switch (fromHexString(testKey)[0]) {
            case 0:
              passing[nodeId].accounts++
              break
            case 1:
              passing[nodeId].storage++
              break
            case 2:
              passing[nodeId].bytecode++
              break
            default:
              break
          }
          // results.push([testKey, test])
        } catch (err: any) {
          const decoded = decodeStateNetworkContentKey(fromHexString(testKey))
          if ('stateRoot' in decoded) {
            if (!resultsData[toHexString(decoded.stateRoot)]) {
              resultsData[toHexString(decoded.stateRoot)] = {}
            }
            if (!resultsData[toHexString(decoded.stateRoot)][toHexString(decoded.address)]) {
              resultsData[toHexString(decoded.stateRoot)][toHexString(decoded.address)] = {} as any
            }
            if ('slot' in decoded) {
              resultsData[toHexString(decoded.stateRoot)][toHexString(decoded.address)][
                (decoded.slot as any).toString()
              ] = err.message
            } else {
              resultsData[toHexString(decoded.stateRoot)][toHexString(decoded.address)]['account'] =
                err.message
            }
          } else {
            if (!resultsData['bytecode']) {
              resultsData['bytecode'] = {} as any
            }
            resultsData['bytecode'][toHexString(decoded.address)] = err.message
          }
          results.push([testKey, err.message])
        }
        tested[nodeId] = resultsData
        testResults[nodeId] = results
      }
    }
    logTest()
  }
  let k = 0
  let j = 0
  const logRes = () => {
    let row = 7
    process.stdout.cursorTo(0, row)
    process.stdout.clearScreenDown()
    process.stdout.cursorTo(0, row)
    console.log({ a })
    row++
    // process.stdout.cursorTo(0, row)
    // process.stdout.clearScreenDown()
    process.stdout.cursorTo(0, row)
    console.log({ s })
    row++
    // process.stdout.cursorTo(0, row)
    // process.stdout.clearScreenDown()
    process.stdout.cursorTo(0, row)
    console.log({ b })
    row++
    for (let i = started.size - Math.min(started.size, 4); i < started.size; i++) {
      let key = [...started.keys()][i]
      if (!key) {
        break
      }
      // process.stdout.cursorTo(0, row)
      // process.stdout.clearScreenDown()
      process.stdout.cursorTo(0, row)
      console.log(BigInt(key), ...progress.get(key)!)
      row++
      // process.stdout.cursorTo(0, row)
      // process.stdout.clearScreenDown()
      // process.stdout.cursorTo(0, row)
      // console.log('\n')
      // row++
      // for (const line of results.get(key)!) {
      //   process.stdout.cursorTo(0, row)
      //   process.stdout.clearScreenDown()
      //   process.stdout.cursorTo(0, row)
      //   console.log(' '.repeat(BigInt(key).toString().length - 3), line)
      //   row++
      // }
    }
    for (const [nodeId, client] of Object.entries(clients)) {
      // process.stdout.cursorTo(0, row)
      // process.stdout.clearScreenDown()
      process.stdout.cursorTo(0, row)
      console.log(nodeId)
      row++
      for (const [key, val] of Object.entries(client.stats())) {
        // process.stdout.cursorTo(0, row)
        // process.stdout.clearScreenDown()
        process.stdout.cursorTo(0, row)
        console.log(' '.repeat(nodeId.length - 10), key, val)
        row++
      }
      // for (const [state, add] of client.trieMap.entries()) {
      //   // process.stdout.cursorTo(0, row)
      //   // process.stdout.clearScreenDown()
      //   process.stdout.cursorTo(0, row)
      //   console.log(' '.repeat(nodeId.length - 10), state)
      //   row++
      //   for (const [address, storageroot] of add.entries()) {
      //     // process.stdout.cursorTo(0, row)
      //     // process.stdout.clearScreenDown()
      //     process.stdout.cursorTo(0, row)
      //     console.log(' '.repeat(state.length - 10), ' '.repeat(10), address, storageroot)
      //     row++
      //   }
      // }
      process.stdout.cursorTo(0, row)
      console.log({ k, j })
      row++
    }
  }

  const logTest = () => {
    let row = 7
    const errMsg = (err: string) => {
      if (err.startsWith('mismatch')) {
        const e = (err as string).split('/').slice(1)
        for (const line of e) {
          process.stdout.cursorTo(0, row)
          console.log(' '.repeat(5), line)
          row++
        }
      } else if (err.startsWith('NOTFOUND')) {
        const e = (err as string).split('/').slice(1)
        for (const line of e) {
          process.stdout.cursorTo(0, row)
          console.log(' '.repeat(5), line)
          row++
        }
      } else {
        process.stdout.cursorTo(0, row)
        console.log(' '.repeat(10), err)
        row++
      }
    }
    for (const [nodeId, p] of Object.entries(passing)) {
      process.stdout.cursorTo(0, row)
      process.stdout.clearScreenDown()
      process.stdout.cursorTo(0, row)
      console.log('nodeId:', nodeId.slice(0, 5))
      row++
      for (const [key, val] of Object.entries(p)) {
        process.stdout.cursorTo(0, row)
        process.stdout.clearScreenDown()
        process.stdout.cursorTo(0, row)
        console.log(' '.repeat(nodeId.length - 50), key, val)
        row++
      }
      row++
    }
    for (const [nodeId, r] of Object.entries(tested)) {
      process.stdout.cursorTo(0, row)
      process.stdout.clearScreenDown()
      process.stdout.cursorTo(0, row)
      console.log('nodeId:', nodeId.slice(0, 5))
      row++
      for (const [test, res] of Object.entries(r)) {
        process.stdout.cursorTo(0, row)
        process.stdout.clearScreenDown()
        process.stdout.cursorTo(0, row)
        console.log(' '.repeat(5), test)
        row++
        if (test === 'bytecode') {
          for (const [address, err] of Object.entries(res)) {
            process.stdout.cursorTo(0, row)
            process.stdout.clearScreenDown()
            console.log(' '.repeat(5), 'bytecode')
            row++
            process.stdout.cursorTo(0, row)
            console.log(' '.repeat(10), 'address: ', address.slice(0, 6))
            row++
            errMsg(err as string)
          }
        } else {
          for (const [add, val] of Object.entries(res)) {
            process.stdout.cursorTo(0, row)
            process.stdout.clearScreenDown()
            process.stdout.cursorTo(0, row)
            console.log(' '.repeat(10), 'address: ', add)
            row++
            for (const [slot, err] of Object.entries(val)) {
              process.stdout.cursorTo(0, row)
              process.stdout.clearScreenDown()
              process.stdout.cursorTo(0, row)
              if (slot === 'account') {
                console.log(' '.repeat(15), 'account')
                row++
                errMsg(err as string)
              } else {
                console.log(' '.repeat(15), 'slot', slot)
                row++
                errMsg(err as string)
              }
              row++
            }
          }
        }
      }
      row++
    }
    console.log({ k, j })
    row++
  }

  const logTestResults = () => {
    let row = 7
    for (const [nodeId, results] of Object.entries(testResults)) {
      process.stdout.cursorTo(0, row)
      process.stdout.clearScreenDown()
      process.stdout.cursorTo(0, row)
      console.log(nodeId)
      row++
      for (const [key, val] of results) {
        process.stdout.cursorTo(0, row)
        process.stdout.clearScreenDown()
        process.stdout.cursorTo(0, row)
        console.log(' '.repeat(nodeId.length - 10), key, val)
        row++
      }
      row++
    }
    console.log({ k, j })
    row++
  }

  if (isMainThread) {
    process.stdout.cursorTo(0, 0)
    process.stdout.clearScreenDown()
    console.log('-'.repeat(process.stdout.columns))
    console.log(''.repeat(process.stdout.columns))
    console.log('State Network Content Bridge')
    console.log(''.repeat(process.stdout.columns))
    console.log('-'.repeat(process.stdout.columns))
    workerTask()
    getMissed.on('getMissed', (idx) => {
      workerTask('0x' + parseInt(idx).toString(16))
    })
    setInterval(async () => {
      if (k < 4) {
        await workerTask()
        k++
      } else if (k === 6) {
        await runTest()
      }
      k++
    }, 12000)
    setInterval(() => {
      if (j < 84) {
        logRes()
      } else if (j === 72) {
        // logTest()
      }
      j++
    }, 500)
    process.on('SIGINT', () => {
      console.log('\nshutting down...')
      process.exit(0)
    })
  } else {
    const data = workerData
    parentPort?.postMessage(`You said \"${data}\".`)
  }
}

bridgeThread()
