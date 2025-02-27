# Ultralight Devnet Testing

There are a collection of scripts in the `cli` package's `scripts` directory to aid in setting up an ephemeral testnet and seeding it with data and initial connections.

## Starting the devnet

1. Build all packages -- `npm i`
2. Run the devnet script from `[repo root]/packages/cli` -- `npx tsx scripts/devnet.ts --numNodes=[Number of nodes to start]`
3. Observe logs to confirm nodes are running
4. Press `Ctrl+c` to shutdown the devnet at any time

Notes:  The nodes started by the script have a JSON-RPC server enabled.  The port for the first is 8546 and ascends from there.

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
