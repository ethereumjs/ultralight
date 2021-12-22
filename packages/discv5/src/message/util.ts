import { MessageType, RequestMessage, ResponseMessage } from "./types";

export function requestMatchesResponse(req: RequestMessage, res: ResponseMessage): boolean {
  switch (req.type) {
    case MessageType.PING:
      return res.type === MessageType.PONG;
    case MessageType.FINDNODE:
      return res.type === MessageType.NODES;
    case MessageType.REGTOPIC:
      return res.type === MessageType.TICKET;
    case MessageType.TALKREQ:
      return res.type === MessageType.TALKRESP;
    default:
      return false;
  }
}
