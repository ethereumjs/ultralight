
/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "multiaddr/src/ip" {
  export function toString(ip: Uint8Array): string;
}

declare module "multiaddr/src/convert" {
  export function toString(protocol: any, buf: Uint8Array): string;
  export function toBytes(protocol: any, str: string | number): Uint8Array;
}