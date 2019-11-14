import { expect } from "chai";
import { createENR, decode, decodeTxt, encode, encodeTxt } from "../src/enr/enr";
import { ENR, PrivateKey } from "../src/enr/types";

describe("ENR", () => {
  let seq: bigint;
  let privateKey: PrivateKey;
  let record: ENR;

  beforeEach(() => {
    seq = 1n;
    privateKey = Buffer.from("b71c71a67e1177ad4e901695e1b4b9ee17ae16c6668d313eac2f96dbcda3f291", "hex");
    record = createENR(privateKey);
    record.set("ip", Buffer.from("7f000001", "hex"));
    record.set("udp", Buffer.from((30303).toString(16), "hex"));
  });

  it("should encode to RLP encoding", () => {
    const decoded = decode(encode(record, privateKey, seq));
    for (const [k, v] of decoded.entries()) {
      expect(v).to.deep.equal(record.get(k));
    }
  });

  it("should encode to text encoding", () => {
  });

  it("should decode from RLP encoding", () => {
  });

  it("should decode to text encoding", () => {
    const testRecord = decodeTxt("enr:-IS4QHCYrYZbAKWCBRlAy5zzaDZXJBGkcnh4MHcBFZntXNFrdvJjX04jRzjzCBOonrkTfj499SZuOh8R33Ls8RRcy5wBgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQPKY0yuDUmstAHYpMa2_oxVtw0RW_QAdpzBQA8yWM0xOIN1ZHCCdl8");
    for (const [k, v] of testRecord.entries()) {
      expect(v).to.deep.equal(record.get(k));
    }
  });
});
