# FINDCONTENT

Client sends a *talkReq: **FINDCONTENT** [payload: `contentKey`]* as part of a CONTENT LOOKUP

Peers responds with *talkResp: **FOUNDCONTENT** [payload: `uTP_Connection_Id` ]*

Client initiates a uTP connection

When all data has been transfered, the socket and request are both closed.

CONTENT LOOKUP resolves after adding new content to database.

```mermaid
sequenceDiagram
    participant re as socket.Reader
    participant s as UtpSocket
    participant u as Client.Utp
    participant c as Client
    participant r as Peer
    rect rgb(0, 0, 200)
    Note over c: CONTENT LOOKUP
    end
    c ->> r: talkReq: FINDCONTENT [ payload: contentKey ]
    note right of r: Content found in db <br/> Larger than 1 packet
    note right of r: Generates random CID
    r ->> c: talkResp: FOUNDCONTENT [ payload: CID ]
    rect rgb(0, 255, 0)
    note over c: new UtpRequest<FINDCONTENT>(peerId, CID, contentKey)
    end
    c ->> u: [ peerId, CID, contentKey, type  ]
    rect rgb(0, 255, 0)
    note over u: new UTPSocket<READ>(peerId, CID)
    end
    s --> u: 
    note over s: remoteAddr: peerId <br/> sndId: CID <br/> rcdId: CID - 1
    re --> s: 
    note over u: requestKey = func(peerId, CID, CID - 1)
    note over u: Utp.openRequests.set(requestKey, socket)
    s ->> c: SYN
    c ->> r: talkReq: CONTENT [payload: SYN]
    r ->> c: talkResp: CONTENT [empty]
    note right of r: ...
    r ->> c: talkReq: CONTENT [payload: STATE]
    c ->> r: talkResp: CONTENT [empty]
    c ->> u: STATE
    u ->> s: SYN_ACK
    note over s: next expected SeqNr = packet.seqNr + 1
    s ->> re: packet.seqNr
    note over re: Starting SeqNr = packet.seqNr + 1
    s ->> u: SYN_ACK_ACK 
    u ->> c: STATE<SYN_ACK_ACK> 
    c ->> r: talkReq: CONTENT [payload: STATE]
    r ->> c: talkResp: CONTENT [empty]
    note right of r: ...DATA [payload: chunk]
    loop
    r ->> c: talkReq: CONTENT [payload: DATA]
    c ->> r: talkResp: CONTENT [empty]
    c ->> u: uTP Packet, peerId
    note over u: this.openRequests.get(func(peerId, packet.sndId))
    c ->> s: DATA
    note over s: socket.seqNrsReceived.push(packet.seqNr)
    alt
    note left of s: Packet.seqNr in expected order
    s ->> u: ACK
    u ->> c: STATE<ACK>
    else
    note left of s: Packet.seqNr out of order
    note over s: bitmask = [...seqNrsReceived]
    s ->> u: SELECTIVE ACK [payload: bitmask]
    u ->> c: STATE<SelectiveACK> [payload: bitmask ]
    end
    s ->> re: [packet.payload, packet.seqNr]  
    note over re: ContentMap.set(packet.seqNr, packet.payload)
    c ->> r: talkReq: CONTENT [payload: STATE] 
    r ->> c: talkResp: CONTENT [empty]
    end
    r ->> c: talkReq: CONTENT [payload: FIN]
    c ->> r: talkResp: CONTENT [empty]
    c ->> u: FIN<peerId>
    note over u: requestKey = func(peerId, packet.sndId, packet.rcvId)
    note over u: Utp.openRequests.get(requestKey)
    u ->> s: FIN
    s ->> re: [FIN = true, packet.seqNr]
    note right of re: Expected seqNr's [startingSeqNr, ... , packet.seqNr - 1]
    s ->> u: FIN_ACK
    u ->> c: STATE<FIN_ACK>
        c ->> r: talkReq: CONTENT [payload: STATE]
    r ->> c: talkResp: CONTENT [empty]
    note over re: COMPILE CONTENT FROM CHUNKS
    re ->> u: CONTENT
    rect rgb(255, 0, 0)
    note left of u: DESTROY Socket
    end
    u ->> c: [contentKey, content] 
    rect rgb(255, 0, 0)
    note over u: DESTROY Request
    end
    note over c: db.set(contentKey, content)
    rect rgb(0, 0, 255)
    note over c: CONTENT LOOKUP RESOLVES
    end
```