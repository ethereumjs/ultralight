# Ultralight-UTP
 Typescript implementation of uTP for Ultralight Portal Network Client


## uTorrent Transport Protocol

### Packet Header 
```
0       4       8               16              24              32
+-------+-------+---------------+---------------+---------------+
| type  | ver   | extension     | connection_id                  |
+-------+-------+---------------+---------------+---------------+
| timestamp_microseconds                                         |
+---------------+---------------+---------------+-------------=-+
| timestamp_difference_microseconds                              |
+---------------+---------------+---------------+---------------+
| wnd_size                                                       |
+---------------+---------------+---------------+---------------+
| seq_nr                        | ack_nr                         |                                               +---------------+---------------++---------------+---------------



 Selective Ack Extension

0               8               16
+---------------+---------------+---------------+---------------+
| extension  | len              | bitmask                        |
+---------------+---------------+---------------+---------------+
|                               |
+---------------+---------------+

All fields are in network byte order (big endian).
```

### Packets

  
	• Types
		○ ST_DATA
			§ Regular Data packet
			§ Socket is in ConnectionState.connected
			§ Always has a payload
		○ ST_FIN
			§ Finalize the connection.
				□ This is the last packet
			§ Connection will never have a seq_nr greater than this
				□ Socket records this seq_nr as eof_pkt
				□ Will still listen for packets with seq_nr lower than eof_pkt
		○ ST_STATE
			§ ACK packet
			§ No payload
			§ Does NOT   increase seq_nr
		○ ST_RESET
			§ TERMINATE  CONNECTION  FORCEFULLY
			§ The remote host does not have any state for this connection.
			§  It is stale and should be terminated.
		○ ST_SYN
			§ SYNCHRONIZE
				□ Initiates a new connection
			§ On Send:
				□ seq_nr = 1
				□ connection_id = randUint16()
				□ Expect ST_STATE packet as response
			§ On Receive
				□ Initialize new Socket 
					® rcv_id = connection_id (from received SYN header)
					® snd_id = connection_id + 1
					® seq_nr = randUint16()
	• Header
		○ type
			§ The type of packet.
			§ Can be one of:
				□ ST_DATA = 0
				□ ST_FIN = 1
				□ ST_STATE = 2
				□ ST_RESET = 3
				□ ST_SYN = 4
		○ ver
			§ This is the protocol version. The current version is 1.
		○ extension
			§ The type of the first extension in a linked list of extension headers. 
			§ 0 means no extension.
			§ Extensions are linked, just like TCP options. 
			§ If the extension field is non-zero:
				□ Immediately following the uTP header are two bytes:
				0               8               16
				+---------------+---------------+
				| extension     | len           |
				+---------------+---------------+
				□ extension specifies the type of the next extension in the linked list, 
					® 0 terminates the list. 
				□ len specifies the number of bytes of this extension. 
					® Unknown extensions can be skipped by simply advancing len bytes.
			§ There is currently one extension:
				1) Selective acks
					a) Can selectively ACK packets non-sequentially
					b) The selective ACK is only sent when at least one seq_nr was skipped in the received stream. 
						i) The first bit in the mask therefore represents ack_nr + 2. 
						ii) ack_nr + 1 is assumed to have been dropped or be missing when this packet was sent. 
						iii) A set bit represents a packet that has been received, 
						iv) A cleared bit represents a packet that has not yet been received.
					c) extension
						i) 1
					d) len 
						i) in bytes
						ii) At least 4
						iii) In multiples of 4.
					e) bitmask
						i) Payload of at least 32 bits
						ii) In multiples of 32 bits.
						iii) Each bit represents one packet in the send window.
						iv) Bits that are outside of the send window are ignored
						v) A set bit specifies that packet has been received
						vi) A cleared bit specifies that the packet has not been received
				
		○ connection_id
			§ This is a random, unique, number 
				□ Identifying all the packets that belong to the same connection. 
			§ Each socket has:
				□ One connection_id for sending packets 
				□ A different connection_id for receiving packets. 
			§ The endpoint initiating the connection decides which connection_id to use, 
				□ The return path has connection_id + 1.
			§ If the connection_id of a new connection collides with an existing connection
				□ The ST_SYN packet will be unexpected in the existing stream, and ignored
				□ The connection attempt will fail
		○ timestamp_microseconds
			§ This is the 'microseconds' parts of the timestamp of when this packet was sent. This is set using gettimeofday() on posix and QueryPerformanceTimer() on windows. The higher resolution this timestamp has, the better. The closer to the actual transmit time it is set, the better.
		○ timestamp_difference_microseconds
			§ This is the difference between the local time and the timestamp-microseconds in the last received packet, at the time the last packet was received. This is the latest one-way delay measurement of the link from the remote peer to the local machine.
			§ When a socket is newly opened and doesn't have any delay samples yet, this must be set to 0.
		○ wnd_size
			§ Advertised receive window. 
			§ 32 bits wide
			§ Specified in bytes.
			§ The wnd_size is the number of bytes currently in-flight, i.e. sent but not acked. 
			§ Lets the other end cap the wnd_size 
				□ If it cannot receive any faster 
				□ If its receive buffer is filling up.
			§ When sending packets
				□ Set to the number of bytes left in the socket's receive buffer.
		○ seq_nr
			§ The seq_nr of this packet. 
			§ The seq_nr tells the other end in which order packets should be served back to the application layer.
		○ ack_nr
			§ The seq_nr the sender of the packet last received in the other direction


    * Packet Sizes
		○ uTP adjusts its packet size
			§ In order to have as little impact as possible on slow congested links 
			§ As small as 150 bytes per packet. 
		○ Small Packets
			§ Benefits of not clogging a slow up-link, with long serialization delay. 
			§ Cost is that the overhead from the packet headers become significant. 
		○ At high rates, 
			§ large packet sizes are used, 
		○ At slow rates, 
			§ small packet sizes are used.
    • "in-flight"   
		○ Any packet that has been sent, but not yet acked, is considered to be in-flight.
### Socket

	• max_window
		○ The maximum number of bytes the socket may have in-flight at any given time. 
	• cur_window
		○ The number of bytes in-flight
	• wnd_size
		○ Advertised window from the other end. 
		○ Sets an upper limit on the number of packets in-flight.
		○ A SOCKET MAY ONLY SEND A PACKET IF cur_window + packet_size is less than or equal to min(max_window, wnd_size)
		○ An implementation MAY violate the above rule if the wnd_size is smaller than the packet_size, and it paces the packets so that the average cur_window is less than or equal to wnd_size
	• reply_micro
		○ State for the last delay measurement from the other endpoint 
		○ When a packet is received
			§ reply_micro is updated by subtracting timestamp_microseconds (found in the packet_header) from the hosts current time
		○ When a packet is sent 
			§ reply_micro is put in the timestamp_difference_microseconds field of the packet_header.
	• seq_nr
		○ State of the next seq_nr to use when sending a packet
		○ The oldest un-acked packet is seq_nr - cur_window
	• ack_nr
		○ State of the seq_nr that was last received
	• rtt
		○ Round Trip Time in milliseconds
	• rtt_var
		○ rtt variance
		○ every time a packet is ACKed:
			§ rtt and rtt_var are updated by the following formula, 
			§ delta = rtt - packet_rtt
			§ rtt_var += (abs(delta) - rtt_var) / 4
			§ rtt += (packet_rtt - rtt) / 8
		○ The rtt and rtt_var is only updated for packets that were sent ONLY ONCE. 
				□ This avoids problems with figuring out which packet was acked, the first or the second one.
	• Connection State
		○ Socket will update its own connection state while establishing connections
			§ CS_SYN_SENT
				□ State of initializing socket when sending ST_SYN packet
			§ CS_SYN_RECV
				□ State of accepting socket while processing ST_SYN, sending ST_STATE
			§ CS_CONNECTED
				□ State of initializing socket upon receiving ST_STATE packet response to ST_SYN
					® packet will respond with ST_DATA packet
				□ State of accepting socket upon receiving ST_DATA packet response
		○ When both sockets are in CS_CONNECTED
			§ Connection has been established
			§ ST_DATA stream is open
	• minimum_timeout
		○ milliseconds
		○ 500?
	• timeout
		○ The initial timeout is set to 1000 milliseconds
		○ Every time rtt and rtt_var is updated, timeout is updated:
			§ timeout = max(rtt + rtt_var * 4, minimum_timeout)
		○ For every packet consecutive subsequent packet that times out:
				□  timeout is doubled.
	• timeout_counter
		○  Every time a socket sends or receives a packet, it updates its timeout_counter.
			§ If no packet has arrived within timeout number of milliseconds from the last timeout counter reset, 
				□ the socket triggers a timeout. 
				□ It will set its packet_size and max_window to the smallest packet size (150 bytes). 
				□ This allows it to send one more packet, and this is how the socket gets started again if the window size goes down to zero.
	• Packet Loss
		○ If the packet with sequence number (seq_nr - cur_window) has not been acked…
				□ (this is the oldest packet in the send buffer, and the next one expected to be acked), 
			§ …but 3 or more packets have been acked past it…
				□ (through Selective ACK) 
			§ …the packet is assumed to have been lost. 
		○ When receiving 3 duplicate acks, 
			§ ack_nr + 1 is assumed to have been lost 
			§ (if a packet with that seq_nr has been sent).
		○ This is applied to selective acks as well. 
			§ Each packet that is acked in the selective ack message counts as one duplicate ack
			§ If it is 3 or more
				□ Should trigger a re-send of packets that had at least 3 packets acked after them.
		○ When a packet is lost
			§ The max_window is multiplied by 0.5
	
 Congestion Control

    ○ target_delay 
        § set to 100ms
        § Each socket aims to never see more than target_delay on the send link. 
        § If it does, it will throttle back.
    ○ base_delay
        § sliding minimum of lowest value for last 2 minutes
    ○ our_delay
        § A measurement of the current buffering delay on the socket. 
        § Subtracting the base_delay from the timestamp_difference_microseconds in each packet 
        § Used as the driver to determine whether to increase or decrease the send window 
            □ (which controls the send rate).
    ○ CCONTROL_TARGET
        § Buffering delay that uTP accepts on up-link
    ○ off_target
        § CCONTROL_TARGET - our_delay
    ○ send_rate
        § wnd_size / rtt
            □ buffering_delay = our_delay - base_delay
            □ offtarget_factor = (CCONTROL_TARGET - buffering_delay) / ctrgt
            □ window_factor = bytes_acked / cwnd
            □ cwnd += max_possible_gain * window_factor * offtarget_factor
        § This will make the window smaller if off_target is greater than 0 and grow the window if off target is less than 0.
        § If max_window becomes less than 0, it is set to 0. 
        § A window size of zero means that the socket may not send any packets. 
        § In this state, the socket will trigger a timeout 
            □ and force the window size to one packet size, 
            □ and send one packet.

