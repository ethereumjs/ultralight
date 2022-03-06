# UTP Flow

- Reading Socket

  - Accept
    - Receives SYN
  - FindContent
    - Sends SYN

- Writing Socket
  - Offer
    - Sends SYN
  - FoundContent
    - Receives SYN

0: FOUNDCONTENT_WRITE
1: FINDCONTENT_READ - SYN
2: OFFER_WRITE - SYN
3: ACCEPT_READ




## FindContent / FoundContent

- A is **Reader**
- B is **Writer**

- A - sends FindContent
- B - sends FOUNDCONTENT and connection-ID
  - Opens a WRITING socket using connectionID as 'rcvID' connectionId+1 as 'sndId' 
- A - Opens a READING socket using 'connection-ID' as 'sndId' connectionId+1 as 'rcvId'
  - sends SYN with seqNr: 1, ackNr:
- B - Sends SYN-ACK with seqNr: RANDB, ackNr: 1
- A - Sends SYN-ACK-ACK with seqNr: 2, ackNr: RANDB
- B - Sends DATA with seqNr: RANDB + 1, ackNr: 2
- A - Sends STATE with seqNr: 3, AckNr: RANDB + 1
- B - Sends DATA with seqNr: RANDB + 2, ackNr: 3
- A - Sends STATE with seqNr: 4, ackNr: RANDB + 2
- B - Sends FIN with seqNr: RANDB+3, ackNr: 4
- A - Checks to see if it has packets #RANDB+1 and #RANDB+2
  - SENDS STATE packet with seqNr: 5, ackNr: RANDB+3

## Offer / Accept

- A is **Writer**
- B is **Reader**

- A - sends Offer (array)
- B - sends Accept (array and connectionId)
  - Opens READING socket using connectionId as 'rcvId' connectionId+1 as 'sndId'
- A - Triggers uTP protocol

  - UTP - For each piece of -content
    - A Opens a WRITING socket using connectionId as 'sndId' connectionId+1 as 'rcvId'
      - Sends SYN packet with seqNr: 1, ackNr: RANDA
    - B sends SYN-ACK packet with seqNr: RANDB, ackNr: 1
    - A sends DATA packet with seqNr: 2, ackNr: RANDB
    - B sends ACK packet with seqNr: RANDB+1, ackNr: 2
    - A sends DATA packet with seqNr: 3, ackNr: RANDB+1
    - B sends ACK packet with seqNr: RANDB+2, ackNr: 3
    - A sends FIN packet with seqNr: 4, ackNr: RANDB+2
    - B checks to see if it has packets #1, #2, #139
      - sends ACK packet with seqNr: RANDB+3, ackNr: 4
      - Reader recompiles, sends Stream event to client
      - B closes socket and opens new Reading socket
    - A receives STATE with ackNr: FIN (4), closes socket
    - Repeat
