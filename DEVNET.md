# Ultralight Devnet Testing

There are a collection of scripts in the `cli` package's `scripts` directory to aid in setting up an ephemeral testnet and seeding it with data and initial connections.

## Starting the devnet

1. Build all packages -- `npm i`
2. Run the devnet script from `[repo root]/packages/cli` -- `bash scripts/devnet.sh -n [Number of nodes to start]`
3. Observe logs to confirm nodes are running
4. Press `Ctrl+c` to shutdown the devnet at any time

Notes:  The nodes started by the script have a JSON-RPC server enabled.  The port for the first is 8546 and ascends from there.

## Seeding the devnet with content and connections

1. Start the devnet as above
2. Run the `seeder` script -- 
```sh
npx ts-node scripts/seeder.ts --rpcPort=8546 --numBlocks=[number of blocks to seed into network] --sourceFile="[path/to/json/file/with/block/data.json]" --numNodes=[number of nodes in devnet (same as above)]
```
This will load the first `numBlocks` blocks from your `sourceFile` to the the node with the `rpcPort` specified.

3. If all goes well, you should see the nodes start to connect with one another
4. Pass the optional `--utpTest` parameter to the script in order to have the nodes execute uTP tests, streaming data to each other over uTP.

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

## Monitoring the devnet

The devnet script starts each node up with a Prometheus metrics server running at the RPC port number + 10000.  The `seeder` script outputs a file called `targets.json` with a list of targets to the current directory that can be provided to Prometheus for metric scraping.  Add the below to your `prometheus.yml` config file.   Note that `localhost:5051` points to the proxy and reports how many packets have been sent and how many dropped, assuming you provided a value on packet loss.  
```yaml
scrape_configs:
  - job_name: "ultralight_devnet"

    file_sd_configs:
      - files:
        - '/path/to/targets.json'
    
    static_configs:
      - targets: ["localhost:5051"]
```