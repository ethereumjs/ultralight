# Ultralight CLI

This is an experimental tool for running an ultralight node from the command line.  All functionality for the portal module behaves in the same manner as the [browser client](../browser-client).

## Usage

- Start the [proxy](../proxy)
- Run `ts-node src/index.ts --bootnode=enr:[Your favorite bootnode ENR here]`
```js
{
  enrSeq: 1n,
  customPayload: [
    255, 255, 255, 255, 255, 255, 255, 255, 0,
      0,   0,   0,   0,   0,   0,   0,   0, 0,
      0,   0,   0,   0,   0,   0,   0,   0, 0,
      0,   0,   0,   0,   0
  ]
}
```

## Note
This requires Node version 15 or above