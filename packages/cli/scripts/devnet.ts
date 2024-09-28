import { execSync, spawn } from 'child_process'
import * as fs from 'fs'
import jayson from 'jayson/promise/index.js'
import { createRequire } from 'module'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import type { DevnetOpts } from '../src/types.js'
import type { ChildProcessByStdio } from 'child_process'

const bootnodes = [
  'enr:-Jy4QIs2pCyiKna9YWnAF0zgf7bT0GzlAGoF8MEKFJOExmtofBIqzm71zDvmzRiiLkxaEJcs_Amr7XIhLI74k1rtlXICY5Z0IDAuMS4xLWFscGhhLjEtMTEwZjUwgmlkgnY0gmlwhKEjVaWJc2VjcDI1NmsxoQLSC_nhF1iRwsCw0n3J4jRjqoaRxtKgsEe5a-Dz7y0JloN1ZHCCIyg',
  'enr:-Jy4QKSLYMpku9F0Ebk84zhIhwTkmn80UnYvE4Z4sOcLukASIcofrGdXVLAUPVHh8oPCfnEOZm1W1gcAxB9kV2FJywkCY5Z0IDAuMS4xLWFscGhhLjEtMTEwZjUwgmlkgnY0gmlwhJO2oc6Jc2VjcDI1NmsxoQLMSGVlxXL62N3sPtaV-n_TbZFCEM5AR7RDyIwOadbQK4N1ZHCCIyg',
  'enr:-Jy4QH4_H4cW--ejWDl_W7ngXw2m31MM2GT8_1ZgECnfWxMzZTiZKvHDgkmwUS_l2aqHHU54Q7hcFSPz6VGzkUjOqkcCY5Z0IDAuMS4xLWFscGhhLjEtMTEwZjUwgmlkgnY0gmlwhJ31OTWJc2VjcDI1NmsxoQPC0eRkjRajDiETr_DRa5N5VJRm-ttCWDoO1QAMMCg5pIN1ZHCCIyg',
  'enr:-IS4QGUtAA29qeT3cWVr8lmJfySmkceR2wp6oFQtvO_uMe7KWaK_qd1UQvd93MJKXhMnubSsTQPJ6KkbIu0ywjvNdNEBgmlkgnY0gmlwhMIhKO6Jc2VjcDI1NmsxoQJ508pIqRqsjsvmUQfYGvaUFTxfsELPso_62FKDqlxI24N1ZHCCI40',
  'enr:-IS4QNaaoQuHGReAMJKoDd6DbQKMbQ4Mked3Gi3GRatwgRVVPXynPlO_-gJKRF_ZSuJr3wyHfwMHyJDbd6q1xZQVZ2kBgmlkgnY0gmlwhMIhKO6Jc2VjcDI1NmsxoQM2kBHT5s_Uh4gsNiOclQDvLK4kPpoQucge3mtbuLuUGYN1ZHCCI44',
  'enr:-IS4QBdIjs6S1ZkvlahSkuYNq5QW3DbD-UDcrm1l81f2PPjnNjb_NDa4B5x4olHCXtx0d2ZeZBHQyoHyNnuVZ-P1GVkBgmlkgnY0gmlwhMIhKO-Jc2VjcDI1NmsxoQOO3gFuaCAyQKscaiNLC9HfLbVzFdIerESFlOGcEuKWH4N1ZHCCI40',
  'enr:-IS4QM731tV0CvQXLTDcZNvgFyhhpAjYDKU5XLbM7sZ1WEzIRq4zsakgrv3KO3qyOYZ8jFBK-VzENF8o-vnykuQ99iABgmlkgnY0gmlwhMIhKO-Jc2VjcDI1NmsxoQMTq6Cdx3HmL3Q9sitavcPHPbYKyEibKPKvyVyOlNF8J4N1ZHCCI44',
  'enr:-IS4QFV_wTNknw7qiCGAbHf6LxB-xPQCktyrCEZX-b-7PikMOIKkBg-frHRBkfwhI3XaYo_T-HxBYmOOQGNwThkBBHYDgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQKHPt5CQ0D66ueTtSUqwGjfhscU_LiwS28QvJ0GgJFd-YN1ZHCCE4k',
  'enr:-IS4QDpUz2hQBNt0DECFm8Zy58Hi59PF_7sw780X3qA0vzJEB2IEd5RtVdPUYZUbeg4f0LMradgwpyIhYUeSxz2Tfa8DgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQJd4NAVKOXfbdxyjSOUJzmA4rjtg43EDeEJu1f8YRhb_4N1ZHCCE4o',
  'enr:-IS4QGG6moBhLW1oXz84NaKEHaRcim64qzFn1hAG80yQyVGNLoKqzJe887kEjthr7rJCNlt6vdVMKMNoUC9OCeNK-EMDgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQLJhXByb3LmxHQaqgLDtIGUmpANXaBbFw3ybZWzGqb9-IN1ZHCCE4k',
  'enr:-IS4QA5hpJikeDFf1DD1_Le6_ylgrLGpdwn3SRaneGu9hY2HUI7peHep0f28UUMzbC0PvlWjN8zSfnqMG07WVcCyBhADgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQJMpHmGj1xSP1O-Mffk_jYIHVcg6tY5_CjmWVg1gJEsPIN1ZHCCE4o',
]
const { Client } = jayson
const require = createRequire(import.meta.url)

const args: any = yargs(hideBin(process.argv))
  .option('pks', {
    describe: 'text file containing private keys for nodes in devnet',
    string: true,
    optional: true,
  })
  .option('numNodes', {
    describe: 'number of random nodes to start',
    number: true,
    default: 1,
    optional: true,
  })
  .option('ip', {
    describe: 'ip addr',
    string: true,
    optional: true,
  })
  .option('promConfig', {
    describe: 'create prometheus scrape_target file',
    boolean: true,
    default: false,
  })
  .option('port', {
    describe: 'starting port number',
    number: true,
    default: 9000,
  })
  .option('networks', {
    describe: 'supported subnetworks',
    string: true,
    default: 'history,beacon,state',
    optional: true,
  })
  .option('connectNodes', {
    describe: 'connect all nodes on network start',
    boolean: true,
    default: false,
  })
  .option('connectBootNodes', {
    describe: 'connect to bootnodes on network start',
    boolean: false,
    default: false,
  })
  .strict().argv as DevnetOpts

const main = async () => {
  console.log(`starting ${args.numNodes} nodes`)

  const ip = '127.0.0.1'
  const children: ChildProcessByStdio<any, any, null>[] = []

  const file = require.resolve('../src/index.ts')
  if (args.pks !== undefined) {
    const pks = fs.readFileSync(args.pks, { encoding: 'utf8' }).split('\n')
    for (let idx = 0; idx < pks.length; idx++) {
      const child = spawn(
        'tsx',
        [
          file,
          `--rpc`,
          `--rpcAddr=${ip}`,
          `--pk=${pks[idx]}`,
          `--rpcPort=${8545 + idx}`,
          `--metrics=true`,
          `--metricsPort=${18545 + idx}`,
          `--bindAddress-${ip}:${args.port + idx}`,
          `--networks=${args.networks}`,
        ],
        { stdio: ['pipe', 'pipe', process.stderr] },
      )
      children.push(child)
    }
  } else if (args.numNodes !== undefined) {
    for (let x = 0; x < args.numNodes; x++) {
      const child = spawn(
        'tsx',
        [
          file,
          `--rpcAddr=${ip}`,
          `--rpcPort=${8545 + x}`,
          `--metrics=true`,
          `--metricsPort=${18545 + x}`,
          `--bindAddress=${ip}:${args.port + x}`,
          `--networks=${args.networks}`,
        ],
        { stdio: ['pipe', 'pipe', process.stderr] },
      )
      children.push(child)
    }
  }

  // Wait for nodes to start up
  await new Promise((resolve) =>
    setTimeout(() => {
      resolve(undefined)
    }, 10000),
  )

  if (args.promConfig !== undefined) {
    const targets: any[] = []
    for (let idx = 0; idx < children.length; idx++) {
      targets.push(`${ip}:1${args.port + idx}`)
    }
    const targetBlob = [
      Object.assign({
        targets,
        labels: { env: 'devnet' },
      }),
    ]
    fs.writeFileSync('./targets.json', JSON.stringify(targetBlob, null, 2))
  }

  // Connect nodes to other nodes in the network via `addBootNode`
  if (args.connectNodes !== false) {
    console.log('connecting nodes')
    const ultralights: jayson.HttpClient[] = []
    for (let x = 0; x < 10; x++) {
      ultralights.push(Client.http({ host: ip, port: 8545 + x }))
    }

    for (let x = 0; x < args.numNodes; x++) {
      const peerEnr = await ultralights[x].request('discv5_nodeInfo', [])
      for (let y = 0; y < args.numNodes; y++) {
        if (y === x) continue
        for (const network of args.networks) {
          await ultralights[y].request(`portal_${network}AddBootNode`, [peerEnr.result.enr])
        }
      }
    }
  }
  if (args.connectBootNodes !== false) {
    console.log('connecting to bootnodes')
    for (let x = 0; x < args.numNodes; x++) {
      const ultralight = Client.http({ host: ip, port: 8545 + x })
      for (const bootnode of bootnodes) {
        for (const network of args.networks) {
          await ultralight.request(`portal_${network}Ping`, [bootnode])
        }
      }
    }
  }
  process.on('SIGINT', async () => {
    console.log('Caught close signal, shutting down...')

    for (const child of children) {
      child.kill()
    }
  })
}

void main()
