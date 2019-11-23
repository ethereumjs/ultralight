// Custom and aliased types for ENRs

export type NodeId = Buffer;
export type PrivateKey = Buffer;
export type PublicKey = Buffer;
export type Signature = Buffer;
export type SequenceNumber = bigint;

export type ENRKey = string;
export type ENRValue = number | string | Buffer;
export type ENR = Map<ENRKey, ENRValue>;
