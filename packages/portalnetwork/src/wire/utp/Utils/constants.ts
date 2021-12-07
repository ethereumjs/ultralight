import { PacketSizeModus } from "../Protocol/UtpAlgConfiguration"

export const EXTENSION = 0
export const VERSION = 1
export const MAX_UINT_8 = 0xff
export const MAX_BYTE = MAX_UINT_8
export const UINT16MAX = 0xffff
export const ID_MASK = 0xf << 4
export const MTU = 100

export const DELAY_TARGET = 100
export const TWO_MINUTES = 120000000

export const MAX_CWND_INCREASE_PACKETS_PER_RTT = 3000
export const C_CONTROL_TARGET_MICROS = 100000
export const MINIMUM_TIMEOUT_MILLIS = 500

export const MAX_CONNECTION_ATTEMPTS: number = 5;
  export const CONNECTION_ATTEMPT_INTERVALL_MILLIS: number = 5000;
  export const MINIMUM_DELTA_TO_MAX_WINDOW_MICROS: number = 1000000;
  export const SKIP_PACKETS_UNTIL_ACK: number = 2;
  export const AUTO_ACK_SMALLER_THAN_ACK_NUMBER: boolean = true;
  export const MINIMUM_DIFFERENCE_TIMESTAMP_MICROSEC: number = 120000000;
  export const PACKET_SIZE_MODE: PacketSizeModus =
    PacketSizeModus.CONSTANT_1472;
  export const MAX_PACKET_SIZE: number = 1472;
  export const MIN_PACKET_SIZE: number = 150;
  export const MINIMUM_MTU: number = 576;
  export const SEND_IN_BURST: boolean = true;
  export const MAX_BURST_SEND: number = 5;
  export const MIN_SKIP_PACKET_BEFORE_RESEND: number = 3;
  export const MICROSECOND_WAIT_BETWEEN_BURSTS: number = 28000;
  export const TIME_WAIT_AFTER_LAST_PACKET: number = 3000000;
  export const ONLY_POSITIVE_GAIN: boolean = false;
  export const DEBUG: boolean = false;
  export const MAX_UTP_PACKET_LENGTH = MAX_PACKET_SIZE
	export const MAX_UDP_HEADER_LENGTH = 48;
	export const DEF_HEADER_LENGTH = 20;