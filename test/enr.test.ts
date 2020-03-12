import { expect } from "chai";
import { ENR, v4 } from "../src/enr";

describe("ENR", () => {
  let seq: bigint;
  let privateKey: Buffer;
  let record: ENR;

  beforeEach(() => {
    seq = 1n;
    privateKey = Buffer.from("b71c71a67e1177ad4e901695e1b4b9ee17ae16c6668d313eac2f96dbcda3f291", "hex");
    record = ENR.createV4(v4.publicKey(privateKey));
    record.set("ip", Buffer.from("7f000001", "hex"));
    record.set("udp", Buffer.from((30303).toString(16), "hex"));
    record.seq = seq;
  });

  it("should encode/decode to RLP encoding", () => {
    const decoded = ENR.decode(record.encode(privateKey));
    expect(decoded).to.deep.equal(record);
  });

  it("should encode/decode to text encoding", () => {
    const testTxt = "enr:-IS4QHCYrYZbAKWCBRlAy5zzaDZXJBGkcnh4MHcBFZntXNFrdvJjX04jRzjzCBOonrkTfj499SZuOh8R33Ls8RRcy5wBgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQPKY0yuDUmstAHYpMa2_oxVtw0RW_QAdpzBQA8yWM0xOIN1ZHCCdl8";
    const decoded = ENR.decodeTxt(testTxt);
    expect(decoded).to.deep.equal(record);
    expect(record.encodeTxt(privateKey)).to.equal(testTxt);
  });
});
