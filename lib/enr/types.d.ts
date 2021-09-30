/**
 * We represent NodeId as a hex string, since node equality is used very heavily
 * and it is convenient to index data by NodeId
 */
export declare type NodeId = string;
export declare type SequenceNumber = bigint;
export declare type ENRKey = string;
export declare type ENRValue = Uint8Array;
