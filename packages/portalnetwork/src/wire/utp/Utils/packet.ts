/**
 * Compute the number of bytes required for a TALKREQ message header
 * @param protocolIdLen is the length of the protocol ID
 * @returns the number of bytes required for a TALKREQ message header
 *
 * @note Shamelessly copied from [Fluffy](https://github.com/status-im/nimbus-eth1/blob/45767278174a48521de46f029f6e66dc526880f6/fluffy/network/wire/messages.nim#L179)
 */

export const getTalkReqOverhead = (protocolIdLen: number): number => {
  return (
    16 + // IV size
    55 + // header size
    1 + // talkReq msg id
    3 + // rlp encoding outer list, max length will be encoded in 2 bytes
    9 + // request id (max = 8) + 1 byte from rlp encoding byte string
    protocolIdLen + // bytes length of protocolid (e.g. 0x500b for History Network)
    1 + // + 1 is necessary due to rlp encoding of byte string
    3 + // rlp encoding response byte string, max length in 2 bytes
    16 // HMAC
  )
}
