/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "multiaddr/src/ip" {
  export function toString(ip: Buffer): string;
}

declare module "multiaddr/src/convert" {
  export function toString(protocol: any, buf: Buffer): string | number;
  export function toBuffer(protocol: any, str: string | number): Buffer;
}
