import { ENR } from "@chainsafe/discv5";
import { Button } from "@chakra-ui/button";
import { Box, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useDisclosure } from "@chakra-ui/react";
import PeerId from "peer-id";
import { PortalNetwork } from "portalnetwork";
import React, { useEffect, useRef, useState } from "react";

type infoprops = {
  portal: PortalNetwork;
};

const hexByByte: string[] = [];

export function toHexString(bytes: Uint8Array = new Uint8Array()): string {
  let hex = "0x";
  for (const byte of bytes) {
    if (!hexByByte[byte]) {
      hexByByte[byte] = byte < 16 ? "0" + byte.toString(16) : byte.toString(16);
    }
    hex += hexByByte[byte];
  }
  return hex;
}
const ShowInfo: React.FC<infoprops> = ({ portal }) => {

  const { isOpen, onOpen, onClose } = useDisclosure()
  const discv5 = portal.client;
  const [pid, setPid] = useState<PeerId>();
  const [enr, setENR] = useState<ENR>();
  const [newLookupMessage, setNewLookupMessage] = useState<
    string | undefined
  >();
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const row: React.CSSProperties = {
    display: "flex",
    border: "solid black 1px",
  };
  const col: React.CSSProperties = {
    flex: "50%",
    wordBreak: "break-all",
    margin: "2px",
    fontSize: "0.7rem"
  };

  async function perId() {
    let peerId = discv5.enr && (await discv5.enr.peerId());
    setPid(peerId);
  }

  useEffect(() => {
    discv5 && setENR(discv5.enr);
    discv5 && perId();
    setNewLookupMessage("");
  }, [portal]); // eslint-disable-line

  return enr ? (
    <>
      <Button mt={3} ref={btnRef} onClick={onOpen}>
      ENR Details
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ENR Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <div style={row}>
              <div style={col}>
                <div style={row}>
                  <div style={col}>ENR ID:</div>
                  <div style={col}>
                    <div style={row}>
                      <div style={col}>{enr?.id}</div>
                      <div style={col}>
                        0x{Buffer.from(enr?.id).toString("hex")}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={row}>
                  <div style={col}>IP:</div>
                  <div style={col}>{enr?.ip}</div>
                </div>
                <div style={row}>
                  <div style={col}>uPD:</div>
                  <div style={col}>
                    <div style={row}>
                      <div style={col}>{enr?.udp}</div>
                      <div style={col}>0x{enr?.udp?.toString(16)}</div>
                    </div>
                  </div>
                </div>
                <div style={row}>
                  <div style={col}>keypairType:</div>
                  <div style={col}>{enr?.keypairType}</div>
                </div>
                <div style={row}>
                  <div style={col}>Sequence Number:</div>
                  <div style={col}>{Number(enr?.seq)}</div>
                </div>

                <div style={row}>
                  <div style={col}>Location Multiaddress:</div>
                  <div style={col}>
                    <div style={row}>
                      <div style={col}>- bytes: </div>
                      <div style={col}>
                        {toHexString(enr?.getLocationMultiaddr("udp")?.bytes)}
                      </div>
                    </div>
                    <div style={row}>
                      <div style={col}>- string: </div>
                      <div style={col}>
                        {enr?.getLocationMultiaddr("udp")?.toString()}
                      </div>
                    </div>
                    <div style={row}>
                      <div style={col}>- family: </div>
                      <div style={col}>
                        {enr?.getLocationMultiaddr("udp")?.toOptions()?.family}
                      </div>
                    </div>
                    <div style={row}>
                      <div style={col}>- host:</div>
                      <div style={col}>
                        {" "}
                        {enr?.getLocationMultiaddr("udp")?.toOptions()?.host}
                      </div>
                    </div>
                    <div style={row}>
                      <div style={col}>- transport:</div>
                      <div style={col}>
                        <div style={row}>
                          <div style={col}>
                            {
                              enr?.getLocationMultiaddr("udp")?.toOptions()
                                ?.transport
                            }
                          </div>
                          <div style={col}>
                            0x
                            {Buffer.from(
                              // @ts-ignore
                              enr.getLocationMultiaddr("udp").toOptions()
                                ?.transport
                            ).toString("hex")}
                          </div>
                          {encodeURIComponent("udp")}
                        </div>
                      </div>
                    </div>
                    <div style={row}>
                      <div style={col}>- port:</div>
                      <div style={col}>
                        {enr?.getLocationMultiaddr("udp")?.toOptions()?.port}
                      </div>
                    </div>
                    <div style={row}>
                      <div style={col}>- protoCodes:</div>
                      {enr
                        ?.getLocationMultiaddr("udp")
                        ?.protoCodes()
                        .map((code, idx) => {
                          return (
                            <div key={idx} style={col}>
                              {code}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <div style={row}>
                  <div style={col}>Protos:</div>
                  <div style={col}>
                    <div style={row}>
                      {enr
                        ?.getLocationMultiaddr("udp")
                        ?.protos()
                        .map((proto, idx) => {
                          return (
                            <div key={idx} style={col}>
                              {Object.entries(proto).map(([k, v], idx) => {
                                return (
                                  <div key={idx} style={row}>
                                    <div style={col}>{`${k}:`}</div>
                                    <div style={col}>{`${v}`}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}{" "}
                    </div>
                  </div>
                </div>
              </div>
              <div style={col}>
                <h2 style={{ textAlign: "center", fontWeight: "bold" }}>ENR</h2>
                <div style={row}></div>
                <div style={row}>
                  <div style={col}>
                    {enr?.encodeTxt(discv5.keypair.privateKey)}
                  </div>
                </div>
                <h2 style={{ textAlign: "center", fontWeight: "bold" }}>
                  Ethereum Node Record:
                </h2>
                <div style={row}>
                  <div style={col}>
                    {`0x${enr
                      ?.encode(discv5.keypair.privateKey)
                      .toString("hex")}`}
                  </div>
                </div>
                <h2 style={{ textAlign: "center", fontWeight: "bold" }}>
                  Node Id:{" "}
                </h2>
                <div style={row}>
                  <div style={col}>0x{enr?.nodeId}</div>
                </div>
                <h2 style={{ textAlign: "center", fontWeight: "bold" }}>
                  publicKey:
                </h2>
                <div style={row}>
                  <div style={col}>{`0x${enr?.publicKey.toString("hex")}`}</div>
                </div>
                <h2 style={{ textAlign: "center", fontWeight: "bold" }}>
                  Signature:
                </h2>
                <div style={row}>
                  <div style={col}>{`0x${enr?.signature?.toString(
                    "hex"
                  )}`}</div>
                </div>
                <h2 style={{ textAlign: "center", fontWeight: "bold" }}>
                  Peer Id:
                </h2>
                <div style={row}>
                  <div style={col}>0x{pid?.toHexString()}</div>
                </div>
                <h2 style={{ textAlign: "center", fontWeight: "bold" }}>
                  Peer Id B5BString:
                </h2>
                <div style={row}>
                  <div style={col}>{pid?.toB58String()}</div>
                </div>
              </div>
            </div>
          </ModalBody>
        </ModalContent>

        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </Modal>
    </>
  ) : (
    <div style={row}>discv5:sessionService Starting session service...</div>
  );
};

export default ShowInfo;
