"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["PING"] = 1] = "PING";
    MessageType[MessageType["PONG"] = 2] = "PONG";
    MessageType[MessageType["FINDNODE"] = 3] = "FINDNODE";
    MessageType[MessageType["NODES"] = 4] = "NODES";
    MessageType[MessageType["TALKREQ"] = 5] = "TALKREQ";
    MessageType[MessageType["TALKRESP"] = 6] = "TALKRESP";
    MessageType[MessageType["REGTOPIC"] = 7] = "REGTOPIC";
    MessageType[MessageType["TICKET"] = 8] = "TICKET";
    MessageType[MessageType["REGCONFIRMATION"] = 9] = "REGCONFIRMATION";
    MessageType[MessageType["TOPICQUERY"] = 10] = "TOPICQUERY";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
