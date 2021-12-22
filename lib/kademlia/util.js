"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNodeLog2Distance = exports.log2Distance = exports.distance = void 0;
const bigint_buffer_1 = require("bigint-buffer");
const util_1 = require("../util");
const constants_1 = require("./constants");
/**
 * Computes the xor distance between two NodeIds
 */
function distance(a, b) {
    return bigint_buffer_1.toBigIntBE(util_1.fromHex(a)) ^ bigint_buffer_1.toBigIntBE(util_1.fromHex(b));
}
exports.distance = distance;
function log2Distance(a, b) {
    const d = distance(a, b);
    if (!d) {
        return 0;
    }
    return constants_1.NUM_BUCKETS - d.toString(2).padStart(constants_1.NUM_BUCKETS, "0").indexOf("1");
}
exports.log2Distance = log2Distance;
/**
 * Calculates the log2 distance for a destination given a target and current iteration
 * As the iteration increases, the distance is incremented / decremented to adjacent distances from the exact distance
 */
function findNodeLog2Distance(a, b) {
    const d = log2Distance(a, b.nodeId);
    const iteration = b.iteration;
    if (b.iteration === 1) {
        return d;
    }
    let difference = 1;
    const results = [d];
    while (results.length < iteration) {
        if (d + difference <= 256) {
            results.push(d + difference);
        }
        if (d - difference > 0) {
            results.push(d - difference);
        }
        difference += 1;
    }
    if (iteration % 2 === 1) {
        results.pop();
    }
    return results.pop();
}
exports.findNodeLog2Distance = findNodeLog2Distance;
