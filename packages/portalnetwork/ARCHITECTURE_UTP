# uTP DIAGRAMS

## FINDCONTENT / FOUNDCONTENT

``` mermaid
sequenceDiagram
    participant uTP(A)
    actor Alice
    actor John
    participant uTP(J)
    rect rgb(200,0,200)
        Note over Alice: CONTENT LOOKUP
    end
    Alice->> John: talkReq: FINDCONTENT [ 'contentKey' ]
    alt no uTP
        rect rgb(200,200,00)
            Note over John: Content size < 1280 bytes?
        end
        rect rgb(00,200,00)
            Note left of John: YES
        end
        John->> Alice: talkResp: FOUNDCONTENT [ content ]
    else uTP
        rect rgb(200,0,00)
            Note right of John: NO
        end
        John -->> uTP(J): [contentKey, peerId]
        Note over uTP(J): Create uTPSocket<Write>
        Note right of uTP(J): remoteAddr: peerId<br/>sndId: rand(Uint16)<br/>rcvId: sndId - 1
        uTP(J) -->> John: [sndId]
        John->>Alice: FOUNDCONTENT [ connectionId ]
        Alice->>uTP(A): [contentKey, peerId, connectionId]
        Note over uTP(A): Create uTPSocket<Read>
        Note left of uTP(A): remoteAddr: peerId <br/> sndId: connectionId - 1 <br/> rcvId: connectionId <br> seqNr: 1 <br/> ackNr: randUint16() 
        Note over uTP(A): Create SYN packet
        uTP(A)-->>Alice: SYN packet
        Note right of uTP(A): type: SYN <br/> seqNr: 1 <br/> ackNr: rand(Uint16)
        Alice->>John: talkReq: CONTENT [SYN Packet]
        John->>Alice: talkResp: CONTENT [empty]
        John-->>uTP(J): SYN Packet
        Note over uTP(J): Create STATE Packet
        uTP(J)-->>John: STATE Packet
        Note left of uTP(J): type: STATE <br/> seqNr: rand(Uint16) <br/> ackNr: 1
        John->>Alice: talkReq: CONTENT [STATE Packet]
        Alice-->>uTP(A): STATE Packet
        Note over uTP(A): Update Socket
        Note left of uTP(A): socket.ackNr = packet.seqNr
        Note over uTP(A): Create STATE Packet
        uTP(A) -->> Alice: STATE Packet
        Note right of uTP(A): type: STATE <br/> seqNr: socket.seqNr++ <br/> ackNr: socket.ackNr
        Alice->>John: talkReq: CONTENT [STATE Packet]
        John->>Alice: talkResp: CONTENT [empty]
        John-->>uTP(J): STATE packet
        rect rgb(150, 200, 255)
            Note over uTP(J): Begin uTP stream
        end
        par
            loop
                Note over uTP(J): Create DATA Packet
                Note right of uTP(J): chunk <br/> (500 bytes)
                uTP(J) -->> uTP(J): 
                uTP(J) -->> John: DATA Packet
                Note right of John: type: DATA <br/> seqNr: socket.seqNr++ <br/> ackNr: 1 <br/> payload: chunk
                John ->> Alice: talkReq: CONTENT [DATA Packet]
                Note over uTP(J): Chunks remaining: ? 
            end
            loop
                Alice ->> John: talkResp: CONTENT [empty]
                Alice -->> uTP(A): DATA Packet
                Note over uTP(A): Process Packet
                Note left of uTP(A): socket.content[packet.seqNr] = chunk
                Note over uTP(A): Update Socket
                Note left of uTP(A): socket.ackNr = packet.seqNr <br/> 
                Note over uTP(A): Create STATE Packet
                uTP(A) -->> Alice: STATE Packet
                Note right of uTP(A): type: STATE <br/> seqNr: socket.seqNr++ <br/> ackNr: socket.ackNr
                Alice ->> John: talkReq: CONTENT [STATE Packet]
            end
            loop
                John ->> Alice: talkResp: CONTENT [empty]
                John -->> uTP(J): STATE Packet
                Note over uTP(J): Process STATE Packet
                Note right of uTP(J): socket.ackNrsReceived.push()packet.ackNr)
                Note over uTP(J): AckNrsReceived === SeqNrsSent ?
            end
        end
        rect rgb(150, 200, 255)
            Note over uTP(A),uTP(J): All DATA Packets Sent and Acked
        end
        Note over uTP(J): Create FIN Packet
        uTP(J) -->> John: FIN Packet
        Note left of uTP(J): type: FIN <br/> seqNr: socket.seqNr++ <br/> ackNr: 1
        John ->> Alice: talkReq: CONTENT [FIN Packet]
        Alice ->> John: talkResp: CONTENT [empty]
        rect rgb(200, 200, 0)
            Note over uTP(J): FIN Packet SENT -- Awaiting FIN ACK
        end
        Alice -->> uTP(A): FIN Packet
        Note over uTP(A): Process Packet
        rect rgb(200, 200, 0)
            Note over uTP(A): FIN Packet received
        end
        Note left of uTP(A): socket.finNr = packet.seqNr
        rect rgb(0, 200, 0)
            Note left of uTP(A): All expected SeqNr's received
        end
        Note over uTP(A): Create STATE packet
        uTP(A) -->> Alice: STATE Packet
        Note right of uTP(A): type: STATE <br/> seqNr: socket.seqNr++ <br/> ackNr: socket.finNr
        Alice ->> John: talkReq: CONTENT [STATE Packet]
        John ->> Alice: talkResp: CONTENT [empty]
        John -->> uTP(J): STATE Packet
        Note over uTP(J): Process STATE Packet
        rect rgb(0, 200, 0)
            Note right of uTP(J): packet.ackNr === socket.seqNr
        end
        Note over uTP(J): FIN Packet Acked 
        rect rgb(200, 0, 0)
            Note over uTP(J): Destroy Socket
        end
        Note over uTP(A): Compile()
        uTP(A) -->> Alice: Compiled DATA
        rect rgb(200,0,0)
            Note over uTP(A): Destroy Socket
        end
    end
    rect rgb(200,0,200)
        Note over Alice: Content Lookup Resolved
    end
```
