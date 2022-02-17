# Ultralight Devnet Testing

There are a collection of scripts in the `cli` package's `scripts` directory to aid in setting up an ephemeral testnet and seeding it with data and initial connections.

## Starting the devnet

1. Build all packages -- `npm i`
2. From `packages/cli`, run the devnet script -- `bash scripts/devnet.sh [Number of nodes to start]`
3. Observe logs to confirm nodes are running
4. Press `Ctrl+c` to shutdown the devnet at any time

## Seeding the devnet with content and connections

1. Start the devnet
2. From `packages/cli`, run the `seeder` script -- 
```sh
npx ts-node scripts/seeder.ts --rpcPort=8546 --numBlocks=[number of blocks to seed into network] --sourceFile="[path/to/json/file/with/block/data.json]" --numNodes=[number of nodes in devnet (same as above)]
```
3. If all goes well, you should see the nodes start to connect with one another

Note: The block data file should contain a json object of the below structure where the RLP is the rlp encoded hex string form of the block:
```json
{
    "0xblock1Hash...": {
        "rlp":"0xabcdef...",
    },
    "0xblock2Hash...": {
        "rlp":"0xabcdef...",
    },
}

```

The first million blocks from Ethereum mainnet can be acquired [here](https://gateway.ipfs.io/ipfs/QmZVRv8iAez6AdWFxBeFTdTfmFceES7tdSXD2e828WfJhG) 


