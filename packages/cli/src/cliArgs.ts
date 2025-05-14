import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import type { ClientOpts } from './types.js'

export const args: ClientOpts = yargs(hideBin(process.argv))
  .parserConfiguration({
    'dot-notation': false,
  })
  .option('pk', {
    describe: 'base64 string encoded protobuf serialized private key',
    optional: true,
    string: true,
  })
  .option('bootnode', {
    describe: 'ENR of Bootnode',
    string: true,
  })
  .option('bindAddress', {
    describe: 'initial IP address and UDP port to bind to',
    optional: true,
    string: true,
  })
  .option('bootnodeList', {
    describe: 'path to a file containing a list of bootnode ENRs',
    optional: true,
    string: true,
  })
  .option('rpc', {
    describe: 'Enable the JSON-RPC server with HTTP endpoint',
    boolean: true,
    default: true,
  })
  .option('rpcPort', {
    describe: 'HTTP-RPC server listening port',
    number: true,
    default: 8545,
  })
  .option('rpcAddr', {
    describe: 'HTTP-RPC server listening interface address',
    optional: true,
    string: true,
  })
  .option('metrics', {
    describe: 'Turn on Prometheus metrics reporting',
    boolean: true,
    default: false,
  })
  .option('metricsPort', {
    describe: 'Port exposed for metrics scraping',
    number: true,
    default: 18545,
  })
  .option('dataDir', {
    describe: 'data directory where content is stored',
    string: true,
    optional: true,
  })
  .option('web3', {
    describe: 'web3 JSON RPC HTTP endpoint for local Ethereum node for sourcing chain data',
    string: true,
    optional: true,
  })
  .option('chainId', {
    describe: 'string representation of the chain id (defaults to mainnet)',
    choices: ['mainnet', 'sepolia', 'angelfood'],
    string: true,
    default: 'mainnet',
  })
  .option('networks', {
    describe: 'subnetworks to enable',
    string: true,
    default: 'history,beacon,state',
  })
  .option('storage', {
    describe: 'Storage space allocated to each subnetwork DB in MB',
    string: true,
    default: '1024, 1024, 1024',
  })
  .option('trustedBlockRoot', {
    describe: 'a trusted blockroot to start light client syncing of the beacon chain',
    string: true,
    optional: true,
  })
  .option('gossipCount', {
    describe: 'number of nodes to gossip to',
    number: true,
    optional: true,
  })
  .option('arch', {
    describe: 'operating system and CPU architecture',
    string: true,
    default: `${process.platform}-${process.arch}`,
  })
  .option('commit', {
    describe: 'short commit hash of the build',
    string: true,
    optional: true,
  })
  .option('supportedVersions', {
    describe: 'supported versions',
    string: true,
    optional: true,
  })
  .strict().argv as ClientOpts
