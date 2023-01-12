import * as WS from 'ws'
import * as dgram from 'dgram'
import yargs from 'yargs' //eslint-disable-next-line
import { hideBin } from 'yargs/helpers'
import http = require('http')
import * as PromClient from 'prom-client'
import debug from 'debug'
import https = require('https')
const log = debug('proxy')
debug.enable('proxy')

const MAX_PACKET_SIZE = 1280

const servers: WS.Server[] = []

const args: any = yargs(hideBin(process.argv))
  .option('nat', {
    describe: 'NAT Traversal options for proxy',
    choices: ['extip', 'localhost', 'ip'],
    default: 'localhost',
    string: true,
  })
  .option('ip', {
    describe: 'specify IP address for UDP proxy to listen on',
    string: true,
    optional: true,
  })
  .option('persistentPort', {
    describe:
      'set proxy to provide persistent port per endpoint to ensure each connection has a consistent port and IP address',
    array: true,
    optional: true,
  })
  .option('metrics', {
    describe: 'enable metrics endpoint',
    boolean: true,
    default: false,
  }).argv

const register = new PromClient.Registry()

const reportMetrics = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  res.writeHead(200)
  res.end(await register.metrics())
}

const setupMetrics = () => {
  return {
    totalPacketsSent: new PromClient.Counter({
      name: 'proxy_total_packets_sent',
      help: 'how many packets have been sent',
    }),
  }
}

const metricsServer = http.createServer(reportMetrics)
let metrics: any

if (args.metrics) {
  metrics = setupMetrics()
  Object.entries(metrics).forEach((entry: any) => {
    register.registerMetric(entry[1])
  })
  metricsServer.listen(5051)
}

const startServer = async (ws: WS.Server, externalIp: string, wssPort = 5050) => {
  log(`websocket server listening on ${args.ip ?? '127.0.0.1'}:${wssPort}`)
  ws.on('connection', async (websocket, req) => {
    websocket.addListener('message', async (data) => {
      if (data.toString().startsWith('port:')) {
        const port = parseInt(data.toString().slice(5))
        console.log('port: ' + port)
        if (args.persistentPort && ws.clients.size > 1) {
          log(`Rejecting additional client connection`)
          websocket.close()
          return
        }
        const udpsocket = dgram.createSocket({
          recvBufferSize: 16 * MAX_PACKET_SIZE,
          sendBufferSize: MAX_PACKET_SIZE,
          type: 'udp4',
        })
        udpsocket.on('message', (data, rinfo) => {
          log('incoming message from', rinfo.address, rinfo.port)
          const connInfo = Uint8Array.from(Buffer.from(JSON.stringify(rinfo)))
          const connLength = Buffer.from(connInfo.length.toString())
          const msg = new Uint8Array([...connLength, ...connInfo, ...Uint8Array.from(data)])
          websocket.send(msg)
        })
        log(`incoming connection from ${req.socket.remoteAddress}:${req.socket.remotePort}`)
        await udpsocket.bind(port).once('error', (e) => {
          return
        })
        // Send external IP address/port to websocket client to update ENR
        const remoteAddrArray = externalIp.split('.')
        const bAddress = Uint8Array.from([
          parseInt(remoteAddrArray[0]),
          parseInt(remoteAddrArray[1]),
          parseInt(remoteAddrArray[2]),
          parseInt(remoteAddrArray[3]),
        ])
        const bPort = Buffer.alloc(2)
        bPort.writeUIntBE(port, 0, 2)
        websocket.send(Buffer.concat([bAddress, bPort]))
        log('UDP proxy listening on ', externalIp, udpsocket.address().port)
        websocket.on('message', (data) => {
          if (data.toString().startsWith('port:')) {
            return
          }
          try {
            const bAddress = Buffer.from(data.slice(0, 4) as ArrayBuffer)
            const address = `${bAddress[0]}.${bAddress[1]}.${bAddress[2]}.${bAddress[3]}`
            const port = Buffer.from(data as ArrayBuffer).readUIntBE(4, 2)
            const payload = Buffer.from(data.slice(6) as ArrayBuffer)
            log('outbound message to', address, port)
            udpsocket.send(payload, port, address)
          } catch (err) {
            log(err)
          }
        })
        websocket.on('close', () => {
          log('socket closed', req.socket.remotePort)
          udpsocket.close()
        })
      }
    })
  })
}

function stop(): void {
  log('proxy server shutting down...')
  servers.forEach((server) => {
    server.removeAllListeners()
    server.close()
  })
  if (args.packetLoss) {
    metricsServer.close()
  }
  process.exit(0)
}

process.on('SIGTERM', () => stop())
process.on('SIGINT', () => stop())

const main = (externalIp: string) => {
  if (args.persistentPort) {
    args.persistentPort.forEach((wssPort: number) => {
      const ws = new WS.Server({
        host: args.ip ?? '127.0.0.1',
        port: wssPort,
        clientTracking: true,
      })
      startServer(ws, externalIp, wssPort)
      servers.push(ws)
    })
  } else {
    const ws = new WS.Server({ host: args.ip ?? '127.0.0.1', port: 5050, clientTracking: true })
    startServer(ws, externalIp, 5050)
    servers.push(ws)
  }
}

switch (args.nat) {
  case 'extip':
    {
      https.get('https://api.ipify.org', (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          main(data)
        })
      })
    }
    break
  case 'localhost':
    main('127.0.0.1')
    break
  case 'ip':
    main(args.ip)
    break
}
