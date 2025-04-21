import { Buffer } from 'buffer'
import process from 'process'

window.Buffer = Buffer
window.process = process
window.global = window

if (typeof global === 'undefined') {
  window.global = window
}

process.env ??= {}
