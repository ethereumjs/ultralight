import { toHexString } from '@chainsafe/ssz'
import tape from 'tape'
import { Packet, PacketHeader, PacketType, SelectiveAckHeader } from '../../src/wire/utp/Packets'

tape('uTP encoding tests', (t) => {
    t.test('SYN packet encoding test', (st) => {
           const synPacketHeader = new PacketHeader({
               pType: PacketType.ST_SYN,
               version: 1,
               extension: 0,
               connectionId: 10049,
               timestamp: 3384187322,
               timestampDiff: 0,
               wndSize: 1048576,
               seqNr: 11884,
               ackNr: 0,
           })
           const synPacket = new Packet({ header: synPacketHeader, payload: Uint8Array.from([]) })
           const encodedPacket = synPacket.encodePacket()
           st.strictEquals(toHexString(encodedPacket), "0x41002741c9b699ba00000000001000002e6c0000", 'successfully encoded SYN packet')
           st.end()
       })
       t.test('ACK packet encoding test', (st) => {
           const ackPacketHeader = new PacketHeader({
               pType: PacketType.ST_STATE,
               version: 1,
               extension: 0,
               connectionId: 10049,
               timestamp: 6195294,
               timestampDiff: 916973699,
               wndSize: 1048576,
               seqNr: 16807,
               ackNr: 11885,
           })
           const ackPacket = new Packet({ header: ackPacketHeader, payload: Uint8Array.from([]) })
           const encodedPacket = ackPacket.encodePacket()
           st.strictEquals(toHexString(encodedPacket), "0x21002741005e885e36a7e8830010000041a72e6d", 'successfully encoded ACK packet')
           st.end()
       })
    t.test('ACK packet with selective ACK encoding test', (st) => {
        const selectiveAckPacketHeader = new SelectiveAckHeader({
            pType: PacketType.ST_STATE,
            version: 1,
            extension: 1,
            connectionId: 10049,
            timestamp: 6195294,
            timestampDiff: 916973699,
            wndSize: 1048576,
            seqNr: 16807,
            ackNr: 11885,
        }, Uint8Array.from([1, 0, 0, 128]))
        const selectiveAckPacket = new Packet({ header: selectiveAckPacketHeader, payload: Uint8Array.from([]) })
        const encodedPacket = selectiveAckPacket.encodePacket()
        st.strictEquals(toHexString(encodedPacket), "0x21012741005e885e36a7e8830010000041a72e6d000401000080", "successfully encoded selective ACK packet")
        st.end()
    })

    t.test('DATA packet encoding test', (st) => {
        const dataPacketHeader = new PacketHeader({
            pType: PacketType.ST_DATA,
            version: 1,
            extension: 0,
            connectionId: 26237,
            timestamp: 252492495,
            timestampDiff: 242289855,
            wndSize: 1048576,
            seqNr: 8334,
            ackNr: 16806,
        })
        const dataPacket = new Packet({ header: dataPacketHeader, payload: Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) })
        const encodedPacket = dataPacket.encodePacket()
        st.strictEquals(toHexString(encodedPacket), "0x0100667d0f0cbacf0e710cbf00100000208e41a600010203040506070809", 'successfully encoded DATA packet')
        st.end()
    })
    t.test('FIN packet encoding test', (st) => {
        const finPacketHeader = new PacketHeader({
            pType: PacketType.ST_FIN,
            version: 1,
            extension: 0,
            connectionId: 19003,
            timestamp: 515227279,
            timestampDiff: 511481041,
            wndSize: 1048576,
            seqNr: 41050,
            ackNr: 16806,
        })
        const finPacket = new Packet({ header: finPacketHeader, payload: Uint8Array.from([]) })
        const encodedPacket = finPacket.encodePacket()
        st.strictEquals(toHexString(encodedPacket), "0x11004a3b1eb5be8f1e7c94d100100000a05a41a6", 'successfully encoded FIN packet')
        st.end()
    })
    t.test('RESET packet encoding test', (st) => {
        const resetPacketHeader = new PacketHeader({
            pType: PacketType.ST_RESET,
            version: 1,
            extension: 0,
            connectionId: 62285,
            timestamp: 751226811,
            timestampDiff: 0,
            wndSize: 0,
            seqNr: 55413,
            ackNr: 16807,
        })
        const resetPacket = new Packet({ header: resetPacketHeader, payload: Uint8Array.from([]) })
        const encodedPacket = resetPacket.encodePacket()
        st.strictEquals(toHexString(encodedPacket), "0x3100f34d2cc6cfbb0000000000000000d87541a7", 'successfully encoded RESET packet')
        st.end()
    })
})
