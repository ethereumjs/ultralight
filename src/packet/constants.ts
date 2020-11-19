export const MAX_PACKET_SIZE = 1280;
export const MIN_PACKET_SIZE = 63;

export const MASKING_KEY_SIZE = 16;

export const PROTOCOL_SIZE = 6;
export const VERSION_SIZE = 2;
export const FLAG_SIZE = 1;
export const NONCE_SIZE = 12;
export const AUTHDATA_SIZE_SIZE = 2;
export const STATIC_HEADER_SIZE = 23;

export const MESSAGE_AUTHDATA_SIZE = 32;
export const WHOAREYOU_AUTHDATA_SIZE = 24;
export const MIN_HANDSHAKE_AUTHDATA_SIZE = 34 + 64 + 33;

export const SIG_SIZE_SIZE = 1;
export const EPH_KEY_SIZE_SIZE = 1;

export const MASKING_IV_SIZE = 16;

export const ID_NONCE_SIZE = 16;

export const ERR_TOO_SMALL = "ERR_PACKET_TOO_SMALL";
export const ERR_TOO_LARGE = "ERR_PACKET_TOO_LARGE";

export const ERR_INVALID_PROTOCOL_ID = "ERR_INVALID_PROTOCOL_ID";
export const ERR_INVALID_VERSION = "ERR_INVALID_VERSION";
export const ERR_INVALID_FLAG = "ERR_INVALID_FLAG";

export const ERR_INVALID_AUTHDATA_SIZE = "ERR_INVALID_AUTHDATA_SIZE";
