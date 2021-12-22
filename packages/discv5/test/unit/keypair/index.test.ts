import { expect } from "chai";
import PeerId from "peer-id";
import { keys } from "libp2p-crypto";
import { createPeerIdFromKeypair, generateKeypair, KeypairType } from "../../../src/keypair";
const { keysPBM, supportedKeys } = keys;

describe("createPeerIdFromKeypair", function() {
  it("should properly create a PeerId from a secp256k1 keypair with private key", async function() {
    const keypair = generateKeypair(KeypairType.secp256k1);
    const privKey = new supportedKeys.secp256k1.Secp256k1PrivateKey(keypair.privateKey, keypair.publicKey);

    const expectedPeerId = await PeerId.createFromPrivKey(privKey.bytes);
    const actualPeerId = await createPeerIdFromKeypair(keypair);

    expect(actualPeerId).to.be.deep.equal(expectedPeerId);
  });
  it("should properly create a PeerId from a secp256k1 keypair without private key", async function() {
    const keypair = generateKeypair(KeypairType.secp256k1);
    delete (keypair as any)._privateKey;
    const pubKey = new supportedKeys.secp256k1.Secp256k1PublicKey(keypair.publicKey);

    const expectedPeerId = await PeerId.createFromPubKey(pubKey.bytes);
    const actualPeerId = await createPeerIdFromKeypair(keypair);

    expect(actualPeerId).to.be.deep.equal(expectedPeerId);
  });
});
