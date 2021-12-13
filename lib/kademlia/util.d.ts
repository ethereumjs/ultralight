import { NodeId } from "../enr";
import { ILookupPeer } from "./types";
/**
 * Computes the xor distance between two NodeIds
 */
export declare function distance(a: NodeId, b: NodeId): bigint;
export declare function log2Distance(a: NodeId, b: NodeId): number;
/**
 * Calculates the log2 distance for a destination given a target and current iteration
 * As the iteration increases, the distance is incremented / decremented to adjacent distances from the exact distance
 */
export declare function findNodeLog2Distance(a: NodeId, b: ILookupPeer): number;
