import {itBench, setBenchOpts} from "@dapplion/benchmark";
import {generateKeypair, KeypairType} from "../../src/keypair";
import {ENR} from "../../src/enr";

describe("ENR", function() {
  setBenchOpts({runs: 50000});

  const keypairWithPrivateKey = generateKeypair(KeypairType.secp256k1);
  const enr = ENR.createV4(keypairWithPrivateKey.privateKey);
  enr.ip = "127.0.0.1";
  enr.tcp = 8080;

  itBench("ENR - getLocationMultiaddr - udp", () => {
    return enr.getLocationMultiaddr("udp");
  });
  itBench("ENR - getLocationMultiaddr - tcp", () => {
    return enr.getLocationMultiaddr("tcp");
  });
});
