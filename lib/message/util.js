"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestMatchesResponse = void 0;
const types_1 = require("./types");
function requestMatchesResponse(req, res) {
    switch (req.type) {
        case types_1.MessageType.PING:
            return res.type === types_1.MessageType.PONG;
        case types_1.MessageType.FINDNODE:
            return res.type === types_1.MessageType.NODES;
        case types_1.MessageType.REGTOPIC:
            return res.type === types_1.MessageType.TICKET;
        default:
            return false;
    }
}
exports.requestMatchesResponse = requestMatchesResponse;
