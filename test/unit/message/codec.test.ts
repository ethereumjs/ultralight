import { expect } from "chai";
import { Message, MessageType, decode, encode } from "../../../src/message";
import { ENR } from "../../../src/enr";

describe("message", () => {
  const testCases: {
    message: Message;
    expected: Buffer;
  }[] = [
    {
      message: {
        type: MessageType.PING,
        id: 1n,
        enrSeq: 1n,
      },
      expected: Buffer.from("01c20101", "hex"),
    },
    {
      message: {
        type: MessageType.PING,
        id: 1n,
        enrSeq: 0n, // < test 0 enrSeq
      },
      expected: Buffer.from("01c20101", "hex"),
    },
    {
      message: {
        type: MessageType.PONG,
        id: 1n,
        enrSeq: 1n,
        recipientIp: "127.0.0.1",
        recipientPort: 5000,
      },
      expected: Buffer.from("02ca0101847f000001821388", "hex"),
    },
    {
      message: {
        type: MessageType.FINDNODE,
        id: 1n,
        distances: [250],
      },
      expected: Buffer.from("03c401c281fa", "hex"),
    },
    {
      message: {
        type: MessageType.NODES,
        id: 1n,
        total: 1,
        enrs: [],
      },
      expected: Buffer.from("04c30101c0", "hex"),
    },
    {
      message: {
        type: MessageType.NODES,
        id: 1n,
        total: 1,
        enrs: [
          ENR.decodeTxt(
            "enr:-HW4QBzimRxkmT18hMKaAL3IcZF1UcfTMPyi3Q1pxwZZbcZVRI8DC5infUAB_UauARLOJtYTxaagKoGmIjzQxO2qUygBgmlkgnY0iXNlY3AyNTZrMaEDymNMrg1JrLQB2KTGtv6MVbcNEVv0AHacwUAPMljNMTg"
          ),
          ENR.decodeTxt(
            "enr:-HW4QNfxw543Ypf4HXKXdYxkyzfcxcO-6p9X986WldfVpnVTQX1xlTnWrktEWUbeTZnmgOuAY_KUhbVV1Ft98WoYUBMBgmlkgnY0iXNlY3AyNTZrMaEDDiy3QkHAxPyOgWbxp5oF1bDdlYE6dLCUUp8xfVw50jU"
          ),
        ],
      },
      expected: Buffer.from(
        "04f8f20101f8eef875b8401ce2991c64993d7c84c29a00bdc871917551c7d330fca2dd0d69c706596dc655448f030b98a77d4001fd46ae0112ce26d613c5a6a02a81a6223cd0c4edaa53280182696482763489736563703235366b31a103ca634cae0d49acb401d8a4c6b6fe8c55b70d115bf400769cc1400f3258cd3138f875b840d7f1c39e376297f81d7297758c64cb37dcc5c3beea9f57f7ce9695d7d5a67553417d719539d6ae4b445946de4d99e680eb8063f29485b555d45b7df16a1850130182696482763489736563703235366b31a1030e2cb74241c0c4fc8e8166f1a79a05d5b0dd95813a74b094529f317d5c39d235",
        "hex"
      ),
    },
  ];
  for (const { message, expected } of testCases) {
    it(`should encode/decode message type ${MessageType[message.type]}`, () => {
      const actual = encode(message);
      // expect(actual).to.deep.equal(expected);
      expect(decode(actual)).to.deep.equal(message);
    });
  }
});
