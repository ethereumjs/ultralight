import jayson from 'jayson/promise/index.js'
import { ENR, PortalNetwork, ProtocolId } from 'portalnetwork'
import { RPCManager } from '../src/rpc.js'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { Multiaddr } from '@multiformats/multiaddr'
import debug, {Debugger} from 'debug'
import * as PromClient from 'prom-client'
import http from 'http'
import { setupMetrics } from '../src/metrics.js'


const main = async (numNodes: number) => {
    const register = new PromClient.Registry()
    const reportMetrics = async (req: http.IncomingMessage, res: http.ServerResponse) => {
        res.writeHead(200)
        res.end(await register.metrics())
      }
    
      const metrics = setupMetrics()
    
    const portals: PortalNetwork[] = [
    ]
    const logs: Debugger[] = []

    
    for (let i=0;i<2;i++) {
        const id = await createSecp256k1PeerId()
        const enr = ENR.createFromPeerId(id)
        const initMa = new Multiaddr(`/ip4/127.0.0.1/udp/${5000 + i}}`)
        enr.setLocationMultiaddr(initMa)
        const log = debug(enr.nodeId.slice(0, 5)).extend('ultralight')
        const portal = await PortalNetwork.create({
            config: {
                enr: enr,
                peerId: id,
                multiaddr: initMa,
                config: {
                    enrUpdate: true,
                    addrVotesToUpdateEnr: 5,
                    allowUnverifiedSessions: true,
                },
            },
            radius: 2n ** 256n - 1n,
            //@ts-ignore Because level doesn't know how to get along with itself
            db: undefined,
            metrics,
            supportedProtocols: [ProtocolId.HistoryNetwork],
            // dataDir: args.datadir
        })
        process.on('SIGINT', async () => {
            console.log('Caught close signal, shutting down...')
            await portal.stop()
            process.exit()
        })
        portals.push(portal)
        logs.push(log)
    }
    for (let i=0;i<numNodes;i++) {
        try {
            const manager = new RPCManager(portals[i])
            const methods = manager.getMethods()
            const server = new jayson.Server(methods)
            portals[i].discv5.enableLogs()
            portals[i].enableLog('*ultralight*, *Portal*, *uTP*')
            await portals[i].start()
            server.http().listen(8545 + i)
            logs[i](`Starting RPC Server at port ${8545 + i}`)
            let metricsServer: http.Server | undefined
            metricsServer = http.createServer(reportMetrics)
            Object.entries(metrics).forEach((entry) => {
              register.registerMetric(entry[1])
            })
            metricsServer.listen(18545 + i)
            logs[i].extend('RPC')(`Started Metrics Server address=http://127.0.0.1:${18545 + i}`)
            
    } catch (e) {
        console.log('error: ', (e as any).message)
    }
}   

}

main(2)