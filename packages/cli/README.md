# Ultralight CLI

This is an experimental tool for running an ultralight node from the command line in a NodeJS environment.  All functionality for the portal module behaves in the same manner as the [browser client](../browser-client).

## Usage

- Clone the ultralight monorepo and run `npm i` from the monorepo root.
- Change to `./packages/cli`
- Run `ts-node src/index.ts --bootnode=enr:[Your favorite bootnode ENR here] --proxy --extip=[your external IP address]`
- Once the node is running, press `p` to ping the specified bootnoode.  If all went well, you should see some output like below.
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