import PeerId from "peer-id";
import { expect, assert } from "chai";
import { ENR } from "../../src/enr/enr";
import { createKeypairFromPeerId } from "../../src/keypair";
import { toHex } from "../../src/util";
import { ERR_INVALID_ID } from "../../src/enr/constants";

describe("ENR", function () {
  describe("decodeTxt", () => {
    it("should encodeTxt and decodeTxt", async () => {
      const peerId = await PeerId.create({ keyType: "secp256k1" });
      const enr = ENR.createFromPeerId(peerId);
      const keypair = createKeypairFromPeerId(peerId);
      const txt = enr.encodeTxt(keypair.privateKey);
      expect(txt.slice(0, 4)).to.be.equal("enr:");
      const enr2 = ENR.decodeTxt(txt);
      expect(toHex(enr2.signature as Buffer)).to.be.equal(toHex(enr.signature as Buffer));
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
