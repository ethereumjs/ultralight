# Ultralight CLI

This is an experimental tool for running an ultralight node from the command line.  All functionality for the portal module behaves in the same manner as the [browser client](../browser-client).

## Usage

- Start the [proxy](../proxy)
- Paste the ENR and Node ID for a currently running browser client 
- Execute `ts-node src/index.ts` and you should see the payload from a PONG message logged to the console as below:
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