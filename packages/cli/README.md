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

### Starting with the same Node ID 

To start a node that has the same node ID each time, you can pass the `--pk` parameter at start-up with a base64 string encoded protobuf serialized private key.  So `ts-node src/index.ts --pk=CAISINx/bjWlmCXTClX2JvDYehb8FSrE6l4MA9LGvP74XdfD` will always start the `cli` client with the node ID `2a9511ca767b7b56bb873234209557d07c5fe09382ed060b272c6a933c5658f5`.

You can use the `generateKeys` script to generate any number of private keys using the command `ts-node scripts/generateKeys --numKeys=X` where X is the number of keys to generate.


## Note
This requires Node version 16 or above