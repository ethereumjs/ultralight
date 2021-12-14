import { BN } from 'bn.js';
import { ENR, KademliaRoutingTable, NodeId } from '@chainsafe/discv5'
import { distance } from './util'
import { PortalNetworkRoutingTable } from '../client';


export class StateNetworkRoutingTable extends PortalNetworkRoutingTable {
    /**
     *
     * @param id id of node to find nearest nodes to
     * @param limit maximum number of nodes to return
     * @returns array of `limit` nearest nodes
     */
    nearest(id: NodeId, limit: number): ENR[] {
        const results: ENR[] = [];
        this.buckets.forEach((bucket) => {
            results.push(...bucket.values());
        });
        results.sort((a, b) => {
            const diff = distance(new BN(id, 16), new BN(a.nodeId, 16)).sub(distance(new BN(id, 16), new BN(b.nodeId, 16)));
            if (diff.isNeg()) return -1;
            if (diff.isZero()) return 0;
            return 1;
        })
        return results.slice(0, limit);
    }
}