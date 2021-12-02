
import WS from 'ws';
import * as dgram from 'dgram'
import ipCodec from '@leichtgewicht/ip-codec'

const MAX_PACKET_SIZE = 1280;

const ws = new WS.Server({ host: '127.0.0.1', port: 5050, clientTracking: true })

const main = async () => {
    const args = process.argv.slice(2)
    let remoteAddr = '127.0.0.1'

    if (args.length > 0) {
        remoteAddr = args[0]
    }

    console.log(`websocket server listening on ${remoteAddr}:5050`)
    ws.on("connection", async (websocket, req) => {
        const udpsocket = dgram.createSocket({
                    recvBufferSize: 16 * MAX_PACKET_SIZE,
                    sendBufferSize: MAX_PACKET_SIZE,
                    type: "udp4"
        });
        udpsocket.on("message", (data, rinfo) => {
            console.log('incoming message from', rinfo.address, rinfo.port)
            const connInfo = Uint8Array.from(Buffer.from(JSON.stringify(rinfo)))
            const connLength = Buffer.from(connInfo.length.toString())
            const msg = new Uint8Array([...connLength, ...connInfo, ...Uint8Array.from(data)])
            websocket.send(msg)
        });
        console.log(`incoming connection from ${req.socket.remoteAddress}:${req.socket.remotePort}`)
        let remotePort: number = 1;
        let foundPort = false;
        while (!foundPort) {
            remotePort = Math.floor(Math.random() * 65535)
            try {
                udpsocket.bind(remotePort)
                foundPort = true
            }
            catch { }
        }
        // Send external IP address/port to websocket client to update ENR
        websocket.send(JSON.stringify({ address: remoteAddr, port: remotePort }));
        console.log('UDP proxy listening on ', remoteAddr, remotePort)
        websocket.on("message", (data) => {
            try {
                const address = ipCodec.decode(Buffer.from(data.slice(0, 4) as ArrayBuffer))
                const port = Buffer.from(data as ArrayBuffer).readUIntBE(4, 2)
                const payload = Buffer.from(data.slice(6) as ArrayBuffer)
                console.log('outbound message to', address, port)
                udpsocket.send(payload, port, address)
            }
            catch (err) {
                console.log(err)
            }
        })
        websocket.on("close", (rinfo) => { console.log("socket closed", req.socket.remotePort); udpsocket.close() })
    })
}

function stop(): void {
    console.log('proxy server shutting down...')
    ws.removeAllListeners();
    ws.close();
    process.exit(0)
}

process.on("SIGTERM", () => stop())
process.on("SIGINT", () => stop())

main()


