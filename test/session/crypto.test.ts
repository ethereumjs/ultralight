/* eslint-env mocha */
import { expect } from "chai";
import secp256k1 = require("bcrypto/lib/secp256k1");
import { randomBytes } from "bcrypto/lib/random";

import {
  IKeys,
  deriveKey,
  generateSessionKeys,
  deriveKeysFromPubkey,
  signNonce,
  verifyNonce,
  encryptMessage,
  decryptMessage,
  encryptAuthResponse,
  decryptAuthHeader,
} from "../../src/session";
import { v4, ENR } from "../../src/enr";
import { KeypairType, createKeypair } from "../../src/keypair";
import {
  encodeAuthResponse,
  createAuthResponse,
  createAuthHeader,
  encodeAuthHeader,
  encode,
  PacketType,
} from "../../src/packet";

describe("session crypto", () => {
  it("ecdh should produce expected secret", () => {
    const expected = Buffer.from("033b11a2a1f214567e1537ce5e509ffd9b21373247f2a3ff6841f4976f53165e7e", "hex");

    const remotePK = Buffer.from(
      "049961e4c2356d61bedb83052c115d311acb3a96f5777296dcf297351130266231503061ac4aaee666073d7e5bc2c80c3f5c5b500c1cb5fd0a76abbb6b675ad157",
      "hex"
    ).slice(0, 65);
    const localSK = Buffer.from("fb757dc581730490a1d7a00deea65e9b1936924caaea8f44d476014856b68736", "hex");

    expect(secp256k1.derive(remotePK, localSK)).to.deep.equal(expected);
  });

  it("key derivation should produce expected keys", () => {
    const expected = [
      Buffer.from("238d8b50e4363cf603a48c6cc3542967", "hex"),
      Buffer.from("bebc0183484f7e7ca2ac32e3d72c8891", "hex"),
      Buffer.from("e987ad9e414d5b4f9bfe4ff1e52f2fae", "hex"),
    ];

    const secret = Buffer.from("02a77e3aa0c144ae7c0a3af73692b7d6e5b7a2fdc0eda16e8d5e6cb0d08e88dd04", "hex");
    const firstNodeId = "a448f24c6d18e575453db13171562b71999873db5b286df957af199ec94617f7";
    const secondNodeId = "885bba8dfeddd49855459df852ad5b63d13a3fae593f3f9fa7e317fd43651409";
    const idNonce = Buffer.alloc(32, 1);

    expect(deriveKey(secret, firstNodeId, secondNodeId, idNonce)).to.deep.equal(expected);
  });

  it("symmetric keys should be derived correctly", () => {
    const sk1 = v4.createPrivateKey();
    const sk2 = v4.createPrivateKey();
    const enr1 = ENR.createV4(v4.publicKey(sk1));
    const enr2 = ENR.createV4(v4.publicKey(sk2));
    const nonce = randomBytes(32);
    const [a1, b1, c1, pk] = generateSessionKeys(enr1.nodeId, enr2, nonce);
    const [a2, b2, c2] = deriveKeysFromPubkey(
      createKeypair(KeypairType.secp256k1, sk2),
      enr2.nodeId,
      enr1.nodeId,
      nonce,
      pk
    );

    expect(a1).to.deep.equal(a2);
    expect(b1).to.deep.equal(b2);
    expect(c1).to.deep.equal(c2);
  });

  it("signature of nonce should match expected value", () => {
    const expected = Buffer.from(
      "c5036e702a79902ad8aa147dabfe3958b523fd6fa36cc78e2889b912d682d8d35fdea142e141f690736d86f50b39746ba2d2fc510b46f82ee08f08fd55d133a4",
      "hex"
    );

    const nonce = Buffer.from("a77e3aa0c144ae7c0a3af73692b7d6e5b7a2fdc0eda16e8d5e6cb0d08e88dd04", "hex");
    const ephemPK = Buffer.from(
      "9961e4c2356d61bedb83052c115d311acb3a96f5777296dcf297351130266231503061ac4aaee666073d7e5bc2c80c3f5c5b500c1cb5fd0a76abbb6b675ad157",
      "hex"
    );
    const localSK = Buffer.from("fb757dc581730490a1d7a00deea65e9b1936924caaea8f44d476014856b68736", "hex");

    const actual = signNonce(createKeypair(KeypairType.secp256k1, localSK), nonce, ephemPK);
    expect(actual).to.deep.equal(expected);
    expect(verifyNonce(createKeypair(KeypairType.secp256k1, undefined, v4.publicKey(localSK)), nonce, ephemPK, actual))
      .to.be.true;
  });

  it("encrypted data should match expected", () => {
    const expected = Buffer.from("a5d12a2d94b8ccb3ba55558229867dc13bfa3648", "hex");

    const key = Buffer.from("9f2d77db7004bf8a1a85107ac686990b", "hex");
    const nonce = Buffer.from("27b5af763c446acd2749fe8e", "hex");
    const pt = Buffer.from("01c20101", "hex");
    const ad = Buffer.from("93a7400fa0d6a694ebc24d5cf570f65d04215b6ac00757875e3f3a5f42107903", "hex");

    expect(encryptMessage(key, nonce, pt, ad)).to.deep.equal(expected);
  });

  it("encrypted data should successfully be decrypted", () => {
    const key = randomBytes(16);
    const nonce = randomBytes(12);
    const msg = randomBytes(16);
    const ad = randomBytes(16);

    const cipher = encryptMessage(key, nonce, msg, ad);
    const decrypted = decryptMessage(key, nonce, cipher, ad);
    expect(decrypted).to.deep.equal(msg);
  });

  it("auth message should be correctly encoded - checking each step", () => {
    const key = Buffer.from("7e8107fe766b6d357205280acf65c24275129ca9e44c0fd00144ca50024a1ce7", "hex");
    const kpriv = createKeypair(KeypairType.secp256k1, key);
    const idNonce = Buffer.from("e551b1c44264ab92bc0b3c9b26293e1ba4fed9128f3c3645301e8e119f179c65", "hex");
    const ephemPK = Buffer.from(
      "b35608c01ee67edff2cffa424b219940a81cf2fb9b66068b1cf96862a17d353e22524fbdcdebc609f85cbd58ebe7a872b01e24a3829b97dd5875e8ffbc4eea81",
      "hex"
    );

    const expectedAuthPt = Buffer.from(
      "f84405b840f753ac31b017536bacd0d0238a1f849e741aef03b7ad5db1d4e64d7aa80689931f21e590edcf80ee32bb2f30707fec88fb62ea8fbcd65b9272e9a0175fea976bc0",
      "hex"
    );

    const authResp = createAuthResponse(signNonce(kpriv, idNonce, ephemPK));

    expect(encodeAuthResponse(authResp, key)).to.deep.equal(expectedAuthPt);

    const authRespKey = Buffer.from("8c7caa563cebc5c06bb15fc1a2d426c3", "hex");
    const expectedAuthRespCiphertext = Buffer.from(
      "570fbf23885c674867ab00320294a41732891457969a0f14d11c995668858b2ad731aa7836888020e2ccc6e0e5776d0d4bc4439161798565a4159aa8620992fb51dcb275c4f755c8b8030c82918898f1ac387f606852",
      "hex"
    );

    expect(encryptAuthResponse(authRespKey, authResp, kpriv.privateKey)).to.deep.equal(expectedAuthRespCiphertext);

    const authTag = Buffer.from("27b5af763c446acd2749fe8e", "hex");
    const expectedAuthHeaderRlp = Buffer.from(
      "f8cc8c27b5af763c446acd2749fe8ea0e551b1c44264ab92bc0b3c9b26293e1ba4fed9128f3c3645301e8e119f179c658367636db840b35608c01ee67edff2cffa424b219940a81cf2fb9b66068b1cf96862a17d353e22524fbdcdebc609f85cbd58ebe7a872b01e24a3829b97dd5875e8ffbc4eea81b856570fbf23885c674867ab00320294a41732891457969a0f14d11c995668858b2ad731aa7836888020e2ccc6e0e5776d0d4bc4439161798565a4159aa8620992fb51dcb275c4f755c8b8030c82918898f1ac387f606852",
      "hex"
    );

    const authHeader = createAuthHeader(idNonce, ephemPK, expectedAuthRespCiphertext, authTag);
    expect(encodeAuthHeader(authHeader)).to.deep.equal(expectedAuthHeaderRlp);
    expect(decryptAuthHeader(authRespKey, authHeader)).to.deep.equal(authResp);

    const tag = Buffer.from("93a7400fa0d6a694ebc24d5cf570f65d04215b6ac00757875e3f3a5f42107903", "hex");
    const encryptionKey = Buffer.from("9f2d77db7004bf8a1a85107ac686990b", "hex");
    const messagePlaintext = Buffer.from("01c20101", "hex");

    const expectedAuthMessageRlp = Buffer.from(
      "93a7400fa0d6a694ebc24d5cf570f65d04215b6ac00757875e3f3a5f42107903f8cc8c27b5af763c446acd2749fe8ea0e551b1c44264ab92bc0b3c9b26293e1ba4fed9128f3c3645301e8e119f179c658367636db840b35608c01ee67edff2cffa424b219940a81cf2fb9b66068b1cf96862a17d353e22524fbdcdebc609f85cbd58ebe7a872b01e24a3829b97dd5875e8ffbc4eea81b856570fbf23885c674867ab00320294a41732891457969a0f14d11c995668858b2ad731aa7836888020e2ccc6e0e5776d0d4bc4439161798565a4159aa8620992fb51dcb275c4f755c8b8030c82918898f1ac387f606852a5d12a2d94b8ccb3ba55558229867dc13bfa3648",
      "hex"
    );

    expect(
      encode({
        type: PacketType.AuthMessage,
        tag,
        authHeader,
        message: encryptMessage(encryptionKey, authTag, messagePlaintext, tag),
      })
    ).to.deep.equal(expectedAuthMessageRlp);
  });
});
