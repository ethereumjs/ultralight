/* eslint-env mocha */
/* eslint-disable max-len */
import { expect } from "chai";
import { decode, encode, IAuthMessagePacket, IWhoAreYouPacket, PacketType, IMessagePacket } from "../../src/packet";

describe("Packet - known test vectors", () => {
  it("should correctly encode/decode random IMessagePacket", () => {
    const magic = Buffer.from("1101010101010101010101010101010101010101010101010101010101010101", "hex");
    const tag = Buffer.from("0101010101010101010101010101010101010101010101010101010101010101", "hex");
    const authTag = Buffer.from("020202020202020202020202", "hex");
    const message = Buffer.from(
      "0404040404040404040404040404040404040404040404040404040404040404040404040404040404040404",
      "hex"
    );
    const p0: IMessagePacket = {
      type: PacketType.Message,
      tag,
      authTag,
      message,
    };
    const expected = Buffer.from(
      "01010101010101010101010101010101010101010101010101010101010101018c0202020202020202020202020404040404040404040404040404040404040404040404040404040404040404040404040404040404040404",
      "hex"
    );
    const b0 = encode(p0);
    expect(b0).to.deep.equal(expected);
    const p1 = decode(b0, magic);
    expect(p1).to.deep.equal(p0);
  });

  it("should correctly encode/decode IWhoAreYouPacket", () => {
    const magic = Buffer.from("0101010101010101010101010101010101010101010101010101010101010101", "hex");
    const token = Buffer.from("020202020202020202020202", "hex");
    const idNonce = Buffer.from("0303030303030303030303030303030303030303030303030303030303030303", "hex");
    const enrSeq = 1;
    const p0: IWhoAreYouPacket = {
      type: PacketType.WhoAreYou,
      magic,
      token,
      idNonce,
      enrSeq,
    };
    const expected = Buffer.from(
      "0101010101010101010101010101010101010101010101010101010101010101ef8c020202020202020202020202a0030303030303030303030303030303030303030303030303030303030303030301",
      "hex"
    );
    const b0 = encode(p0);
    expect(b0).to.deep.equal(expected);
    const p1 = decode(b0, magic);
    expect(p1).to.deep.equal(p0);
  });

  it("should correctly encode/decode IAuthMessagePacket", () => {
    const magic = Buffer.from("0101010101010101010101010101010101010101010101010101010101010101", "hex");
    const tag = Buffer.from("93a7400fa0d6a694ebc24d5cf570f65d04215b6ac00757875e3f3a5f42107903", "hex");
    const authTag = Buffer.from("27b5af763c446acd2749fe8e", "hex");
    const idNonce = Buffer.from("e551b1c44264ab92bc0b3c9b26293e1ba4fed9128f3c3645301e8e119f179c65", "hex");
    const ephemeralPubkey = Buffer.from(
      "b35608c01ee67edff2cffa424b219940a81cf2fb9b66068b1cf96862a17d353e22524fbdcdebc609f85cbd58ebe7a872b01e24a3829b97dd5875e8ffbc4eea81",
      "hex"
    );
    const authResponse = Buffer.from(
      "570fbf23885c674867ab00320294a41732891457969a0f14d11c995668858b2ad731aa7836888020e2ccc6e0e5776d0d4bc4439161798565a4159aa8620992fb51dcb275c4f755c8b8030c82918898f1ac387f606852",
      "hex"
    );
    const message = Buffer.from("a5d12a2d94b8ccb3ba55558229867dc13bfa3648", "hex");
    const p0: IAuthMessagePacket = {
      type: PacketType.AuthMessage,
      tag,
      authHeader: {
        authTag,
        idNonce,
        authSchemeName: "gcm",
        ephemeralPubkey,
        authResponse,
      },
      message,
    };
    const expected = Buffer.from(
      "93a7400fa0d6a694ebc24d5cf570f65d04215b6ac00757875e3f3a5f42107903f8cc8c27b5af763c446acd2749fe8ea0e551b1c44264ab92bc0b3c9b26293e1ba4fed9128f3c3645301e8e119f179c658367636db840b35608c01ee67edff2cffa424b219940a81cf2fb9b66068b1cf96862a17d353e22524fbdcdebc609f85cbd58ebe7a872b01e24a3829b97dd5875e8ffbc4eea81b856570fbf23885c674867ab00320294a41732891457969a0f14d11c995668858b2ad731aa7836888020e2ccc6e0e5776d0d4bc4439161798565a4159aa8620992fb51dcb275c4f755c8b8030c82918898f1ac387f606852a5d12a2d94b8ccb3ba55558229867dc13bfa3648",
      "hex"
    );
    const b0 = encode(p0);
    expect(b0).to.deep.equal(expected);
    const p1 = decode(b0, magic);
    expect(p1).to.deep.equal(p0);
  });

  it("should correctly encode/decode IMessagePacket", () => {
    const magic = Buffer.from("0101010101010101010101010101010101010101010101010101010101010101", "hex");
    const tag = Buffer.from("93a7400fa0d6a694ebc24d5cf570f65d04215b6ac00757875e3f3a5f42107903", "hex");
    const authTag = Buffer.from("27b5af763c446acd2749fe8e", "hex");
    const message = Buffer.from("a5d12a2d94b8ccb3ba55558229867dc13bfa3648", "hex");
    const p0: IMessagePacket = {
      type: PacketType.Message,
      tag,
      authTag,
      message,
    };
    const expected = Buffer.from(
      "93a7400fa0d6a694ebc24d5cf570f65d04215b6ac00757875e3f3a5f421079038c27b5af763c446acd2749fe8ea5d12a2d94b8ccb3ba55558229867dc13bfa3648",
      "hex"
    );
    const b0 = encode(p0);
    expect(b0).to.deep.equal(expected);
    const p1 = decode(b0, magic);
    expect(p1).to.deep.equal(p0);
  });
});
