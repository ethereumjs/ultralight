# Starting a Portal Network Client

This describes the usage and functionality of the Portal Network client script, which enables interaction with Portal Network nodes.

## Usage

The script is invoked using the following format:

```bash
npx tsx examples/src/index.ts --method <method_name> --params <json_params> [--port <port_number>]
```

### Options

| Option     | Description                              | Type    | Default   |
|------------|------------------------------------------|---------|-----------|
| `--method` | Portal Network method to call            | String  | Required  |
| `--params` | Parameters for the method (as JSON)      | String  | `[]`      |
| `--port`   | Port number for the node                 | Number  | `9090`    |

---


### Supported Networks

The client supports two Portal Network types:
- State Network (0x500a)
- History Network (0x500b)

### Message Types

The following message types are supported:
- PING
- PONG
- FINDNODES
- NODES
- TALKREQ
- TALKRESP

## Examples

1. Store data in history network:
```bash
npx tsx examples/src/index.ts --method portal_historyStore --params '["hello world"]'
```

2. Custom port configuration:
```bash
npx tsx examples/src/index.ts --method portal_statePing --params '["enr:-..."]' --port 9091
```