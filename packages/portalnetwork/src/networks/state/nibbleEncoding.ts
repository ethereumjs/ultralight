type Nibble =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
type Nibbles = Nibble[]

// Utility function to convert a nibble into its numerical representation
const nibbleToNumber = (nibble: Nibble): number => parseInt(nibble, 16)

// Utility function to convert a number to a nibble string
const numberToNibble = (number: number): Nibble => number.toString(16) as Nibble

// Pack function
export function packNibbles(nibbles: Nibbles): number[] {
  const length = nibbles.length
  const isOddLength = length % 2 !== 0
  const result: number[] = []

  // First byte encoding based on the length
  if (isOddLength) {
    // Odd number of nibbles
    result.push(0x10 | nibbleToNumber(nibbles[0]))
  } else {
    // Even number of nibbles
    result.push(0x00)
  }

  // Pack remaining nibbles
  for (let i = isOddLength ? 1 : 0; i < length; i += 2) {
    const highNibble = nibbleToNumber(nibbles[i])
    const lowNibble = i + 1 < length ? nibbleToNumber(nibbles[i + 1]) : 0
    result.push((highNibble << 4) | lowNibble)
  }

  return result
}

// Unpack function
// Unpack function corrected
export function unpackNibbles(bytes: number[]): Nibbles {
  if (bytes.length === 0) return []

  const firstByte = bytes[0]
  const isOddLength = (firstByte & 0x10) !== 0
  const nibbles: Nibbles = []

  // Adjusting how the initial byte is processed based on odd or even length
  if (isOddLength) {
    // Directly add the first nibble for odd lengths
    nibbles.push(numberToNibble(firstByte & 0x0f))
  }

  // Correctly processing subsequent bytes
  for (let i = 1; i < bytes.length; i++) {
    const byte = bytes[i]
    nibbles.push(numberToNibble(byte >> 4)) // High nibble
    // For the last byte, avoid adding a low nibble if it's padding (even length)
    if (i < bytes.length - 1 || isOddLength || firstByte === 0x00) {
      nibbles.push(numberToNibble(byte & 0x0f)) // Low nibble
    }
  }

  return nibbles
}
