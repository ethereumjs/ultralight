// crypto-patches.ts
import { decodePacket, decodeHeader } from '@chainsafe/discv5/packet'

// Store references to the original functions
const originalCode = {
  decodePacket,
  decodeHeader
};

// Create patched versions that add logging
function patchedDecodeHeader(srcId: string, maskingIv: Uint8Array, data: Uint8Array): [any, Uint8Array] {
  console.log('Patched decodeHeader called');
  try {
    const result = originalCode.decodeHeader(srcId, maskingIv, data);
    console.log('Patched decodeHeader succeeded');
    return result;
  } catch (error) {
    console.error('Error in decodeHeader:', error);
    throw error;
  }
}

function patchedDecodePacket(srcId: string, data: Uint8Array): any {
  console.log('Patched decodePacket called');
  try {
    const result = originalCode.decodePacket(srcId, data);
    console.log('Patched decodePacket succeeded');
    return result;
  } catch (error) {
    console.error('Error in decodePacket:', error);
    throw error;
  }
}

export const decodeHeaderPatched = patchedDecodeHeader;
export const decodePacketPatched = patchedDecodePacket;