/// <reference types="node" />
import { IPingMessage, IPongMessage, IFindNodeMessage, INodesMessage, IRegTopicMessage, ITicketMessage, IRegConfirmationMessage, ITopicQueryMessage, Message, ITalkReqMessage, ITalkRespMessage } from "./types";
export declare function encode(message: Message): Buffer;
export declare function encodePingMessage(m: IPingMessage): Buffer;
export declare function encodePongMessage(m: IPongMessage): Buffer;
export declare function encodeFindNodeMessage(m: IFindNodeMessage): Buffer;
export declare function encodeNodesMessage(m: INodesMessage): Buffer;
export declare function encodeTalkReqMessage(m: ITalkReqMessage): Buffer;
export declare function encodeTalkRespMessage(m: ITalkRespMessage): Buffer;
export declare function encodeRegTopicMessage(m: IRegTopicMessage): Buffer;
export declare function encodeTicketMessage(m: ITicketMessage): Buffer;
export declare function encodeRegConfirmMessage(m: IRegConfirmationMessage): Buffer;
export declare function encodeTopicQueryMessage(m: ITopicQueryMessage): Buffer;
