# Websocket to UDP Proxy

A simple NodeJS websocket-to-UDP proxy to allow browser clients to connect to a UDP based network.  Intended to be used in conjunction with [Ultralight Browser Client](https://github.com/acolytec3/ultralight-browser-client).

## Protocol

### Websocket Handshake/Connection

When a client application first opens a web socket connection to the proxy, the proxy sends its public IPv4 address and an assigned port number to the client in a 6 byte message where the first 4 bytes represent the IPv4 address (XXX.XXX.XXX.XXX) where each byte corresponds to one byte of the IPv4 address and the last 2 bytes represent a port number between 1 and 65535 as a Uint16 (2 byte unsigned integer).

In the context of the Discv5 protocol, the websocket client uses the proxy's public IP address and specified port number in its ENR in order to hook into the Discv5 network.
### Proxy Service

Once the initial websocket connection is established, the proxy acts as a message forwarding service between web socket clients and a UDP based network.

It does so by maintaining a map of websocket connections to UDP port numbers.

#### Websocket -> UDP forwarding
All messages sent by the websocket client begin with the below prefix:
- 4 bytes containing the numeric parts of an IPv4 address (e.g. [192, 168, 0, 1])
- 2 bytes containing a Uint16 (2 byte unsigned integer) representing the port number

So, when a message received containing `[127,0,0,1,122,73,28,96...` is received by the proxy:
 The first 4 bytes are parsed to an ip address of: 127.0.0.1 and the port (represented by `[122, 73]`) is parsed to 31305.  The proxy then sends the remainder of the message (i.e. all bytes starting with the 7th element of the message) to the address 127.0.0.1:31305.

The proxy strips this prefix from the message payload and forwards the remaining bytes to the address and port specified in the prefix via a UDP socket.

#### UDP -> Websocket forwarding

Any message received at a UDP port are forwarded to the corresponding websocket client unmodified.
## Usage

To run a proxy on a local network, run `npm run start`.  

### Websocket configuration
By default, the proxy only listens for websocket connections on `localhost`/`127.0.0.1`.  To have your proxy listen for websocket connections on a specified IP address, pass the `--nat=ip` parameter and the `--ip=[your IP address here]`

### UDP socket configuration
To make your proxy listen for UDP packets on a public facing IP address, run `npm run start --nat=extip` and the proxy will get its public IP address from [Ipify](https://www.ipify.org/) and route all UDP traffic via the external IP address.

### Persistent Ports

To enable a websocket client to maintain a consistent IP and port address, you can pass the `--persistentPort=1234` parameter.  This will start the proxy in "persistent port" mode that accepts only a single websocket connection per specified port.  Each websocket connection will be paired with a persistent UDP socket bonded to the port corresponding the websocket port + 1000.  So, if the proxy is run with `npm run start -- --persistentPort=5050`, it will accept a single incoming websocket connection on `localhost:5050` and will listen for UDP traffic on `localhost:6050`.

The proxy accepts multiple persistent port parameters so the below command will start two websocket listeners with corresponding UDP sockets.
`npm run start -- --persistentPort=5050 --persistentPort=5052`




