import { Buffer } from 'buffer'
import process from 'process'

window.Buffer = Buffer
window.process = process
window.global = window

if (typeof global === 'undefined') {
  window.global = window
}

if (!process.env) {
  process.env = {}
}

// if (!window.crypto) {
//   window.crypto = {
//     subtle: {},
//     getRandomValues: (array: Uint8Array) => crypto.getRandomValues(array),
//     randomUUID: () => crypto.randomUUID()
//   } as Crypto
// }
