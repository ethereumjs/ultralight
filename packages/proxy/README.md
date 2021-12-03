# Websocket to UDP Proxy

A simple NodeJS websocket-to-UDP proxy to allow browser clients to connect to a UDP based network.  Intended to be used in conjunction with [Ultralight Browser Client](https://github.com/acolytec3/ultralight-browser-client).

All messages sent over websockets for routing on to a UDP based network should begin with the below prefix:
- 4 bytes containing the numeric parts of an IPv4 address (e.g. [192, 168, 0, 1])
- 2 bytes containing the byte encoded port number which can be parsed using `Buffer.readUIntBE()`

So, when a message received containing `[127,0,0,1,122,73,28,96...` is received by the proxy:
 The first 4 bytes are parsed to an ip address of: 127.0.0.1 and the port (represented by `[122, 73]`) is parsed to 31305.  The proxy then sends the remainder of the message (i.e. all bytes starting with the 7th element of the message) to the address 127.0.0.1:31305.
## Usage

`npm run proxy -- [YOUR EXTERNAL IP HERE]`

or

`ts-node src/index.ts [YOUR EXTERNAL IP HERE]`

