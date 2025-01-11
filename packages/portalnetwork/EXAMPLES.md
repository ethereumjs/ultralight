# Starting a Portal Network Client

Standalone implementation of starting a Portal Network using UltralightProvider

## Usage

Start nodes with default settings (2 nodes starting from port 9090). `npx tsx scripts/startPortalNetwork.ts` along with any of the below parameters.  Pass `--help` as a CLI parameter for a complete list of available options.


  | Option | Description | Default | Type |
|--------|-------------|---------|------|
| `--numNodes` | Number of nodes to start | 2 | number |
| `--startPort` | Starting port number | 9090 | number |
| `--ip` | IP address to bind to | 127.0.0.1 | string |
| `--networks` | Networks to support | ['history', 'state'] | array |
| `--operation` | Operation to perform | 'discover' | string |
| `--contentFile` | File to store as content | - | string |


nodes to demontrate how one nodes communicate to one another, manages content storage and retrieval, and look into peer discovery

```typescript


```