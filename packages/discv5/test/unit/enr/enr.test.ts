import PeerId from "peer-id";
import { expect, assert } from "chai";
import { ENR } from "../../../src/enr/enr";
import { createKeypairFromPeerId } from "../../../src/keypair";
import { toHex } from "../../../src/util";
import { ERR_INVALID_ID } from "../../../src/enr/constants";
import { Multiaddr } from "multiaddr";

describe("ENR", function () {
  describe("decodeTxt", () => {
    it("should encodeTxt and decodeTxt", async () => {
      const peerId = await PeerId.create({ keyType: "secp256k1" });
      const enr = ENR.createFromPeerId(peerId);
      const keypair = createKeypairFromPeerId(peerId);
      enr.setLocationMultiaddr(new Multiaddr("/ip4/18.223.219.100/udp/9000"));
      const txt = enr.encodeTxt(keypair.privateKey);
      expect(txt.slice(0, 4)).to.be.equal("enr:");
      const enr2 = ENR.decodeTxt(txt);
      expect(toHex(enr2.signature as Buffer)).to.be.equal(toHex(enr.signature as Buffer));
      const multiaddr = enr2.getLocationMultiaddr("udp")!;
      expect(multiaddr.toString()).to.be.equal("/ip4/18.223.219.100/udp/9000");
    });

    it("should decode valid enr successfully", () => {
      const txt =
        "enr:-Ku4QMh15cIjmnq-co5S3tYaNXxDzKTgj0ufusA-QfZ66EWHNsULt2kb0eTHoo1Dkjvvf6CAHDS1Di-htjiPFZzaIPcLh2F0dG5ldHOIAAAAAAAAAACEZXRoMpD2d10HAAABE________x8AgmlkgnY0gmlwhHZFkMSJc2VjcDI1NmsxoQIWSDEWdHwdEA3Lw2B_byeFQOINTZ0GdtF9DBjes6JqtIN1ZHCCIyg";
      const enr = ENR.decodeTxt(txt);
      const eth2 = enr.get("eth2") as Buffer;
      expect(eth2).to.not.be.undefined;
      expect(toHex(eth2)).to.be.equal("f6775d0700000113ffffffffffff1f00");
    });

    it("should throw error - no id", () => {
      try {
        const txt = Buffer.from(
          "656e723a2d435972595a62404b574342526c4179357a7a61445a584a42476b636e68344d486342465a6e75584e467264764a6a5830346a527a6a7a",
          "hex"
        ).toString();
        ENR.decodeTxt(txt);
        assert.fail("Expect error here");
      } catch (err) {
        expect(err.message).to.be.equal(ERR_INVALID_ID);
      }
    });

    it("should throw error - no public key", () => {
      try {
        const txt =
          "enr:-IS4QJ2d11eu6dC7E7LoXeLMgMP3kom1u3SE8esFSWvaHoo0dP1jg8O3-nx9ht-EO3CmG7L6OkHcMmoIh00IYWB92QABgmlkgnY0gmlwhH8AAAGJc2d11eu6dCsxoQIB_c-jQMOXsbjWkbN-kj99H57gfId5pfb4wa1qxwV4CIN1ZHCCIyk";
        ENR.decodeTxt(txt);
        assert.fail("Expect error here");
      } catch (err) {
        expect(err.message).to.be.equal("Failed to verify enr: No public key");
      }
    });
  });

  describe("verify", () => {
    it("should throw error - no id", () => {
      try {
        const enr = new ENR({}, BigInt(0), Buffer.alloc(0));
        enr.verify(Buffer.alloc(0), Buffer.alloc(0));
        assert.fail("Expect error here");
      } catch (err) {
        expect(err.message).to.be.equal(ERR_INVALID_ID);
      }
    });

    it("should throw error - invalid id", () => {
      try {
        const enr = new ENR({ id: Buffer.from("v3") }, BigInt(0), Buffer.alloc(0));
        enr.verify(Buffer.alloc(0), Buffer.alloc(0));
        assert.fail("Expect error here");
      } catch (err) {
        expect(err.message).to.be.equal(ERR_INVALID_ID);
      }
    });

    it("should throw error - no public key", () => {
      try {
        const enr = new ENR({ id: Buffer.from("v4") }, BigInt(0), Buffer.alloc(0));
        enr.verify(Buffer.alloc(0), Buffer.alloc(0));
        assert.fail("Expect error here");
      } catch (err) {
        expect(err.message).to.be.equal("Failed to verify enr: No public key");
      }
    });

    it("should return false", () => {
      const txt =
        "enr:-Ku4QMh15cIjmnq-co5S3tYaNXxDzKTgj0ufusA-QfZ66EWHNsULt2kb0eTHoo1Dkjvvf6CAHDS1Di-htjiPFZzaIPcLh2F0dG5ldHOIAAAAAAAAAACEZXRoMpD2d10HAAABE________x8AgmlkgnY0gmlwhHZFkMSJc2VjcDI1NmsxoQIWSDEWdHwdEA3Lw2B_byeFQOINTZ0GdtF9DBjes6JqtIN1ZHCCIyg";
      const enr = ENR.decodeTxt(txt);
      // should have id and public key inside ENR
      expect(enr.verify(Buffer.alloc(0), Buffer.alloc(0))).to.be.false;
    });
  });
});

describe("ENR fuzzing testcases", () => {
  it("should throw error in invalid signature", () => {
    const buf = Buffer.from("656e723a2d4b7634514147774f54385374716d7749354c486149796d494f346f6f464b664e6b456a576130663150384f73456c67426832496a622d4772445f2d623957346b6350466377796e354845516d526371584e716470566f3168656f42683246306447356c64484f494141414141414141414143455a58526f4d704141414141414141414141505f5f5f5f5f5f5f5f5f5f676d6c6b676e5930676d6c7768424c663232534a6332566a634449314e6d73786f514a78436e4536765f7832656b67595f756f45317274777a76477934306d7139654436365866485042576749494e315a48437f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f434436410d0a", 'hex').toString()
    try {
      ENR.decodeTxt(buf);
    } catch (e) {
      expect(e.message).to.equal("Decoded ENR invalid signature: must be a byte array");
    }
  });
  it("should throw error in invalid sequence number", () => {
    const buf = Buffer.from("656e723a2d495334514b6b33ff583945717841337838334162436979416e537550444d764b353264433530486d31584744643574457951684d3356634a4c2d5062446b44673541507a5f706f76763022d48dcf992d5379716b306e616e636f4e572d656e7263713042676d6c6b676e5930676d6c77684838414141474a6332566a634449314e6d73786f514d31453579557370397638516a397476335a575843766146427672504e647a384b5049314e68576651577a494e315a4843434239410a", 'hex').toString()
    try {
      ENR.decodeTxt(buf);
    } catch (e) {
      expect(e.message).to.equal("Decoded ENR invalid sequence number: must be a byte array");
    }
  });
})
