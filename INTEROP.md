# Interop instructions

## Local devnet with Fluffy and Ultralight browser and CLI clients

- Follow the Quick-Start instructions in the main [README](./README.md) to get the Ultralight clients up and running
- Build Fluffy following [these instructions](https://github.com/status-im/nimbus-eth1/tree/master/fluffy#build-fluffy-client)
- Open a terminal window in the root directory for the Fluffy repo and run `./build/fluffy --rpc --nat=extip:127.0.0.1 --bootstrap-node=[ Ultralight node's ENR here]`
- Fluffy should connect and you will start seeing logs showing `PING/PONG`
- If you add Fluffy's ENR to the browser client following the steps described in the quickstart, you can also interact with Fluffy using the various options available

## Connecting with public Trin bootnodes

- Copy one of the [trin public bootnode ENRs](https://github.com/ethereum/portal-network-specs/blob/master/testnet.md)
- Start the CLI client using this command `npm run start -w=cli -- --proxy --nat=extip --bootnode=[trin bootnode enr]`
- Once the client starts, press `p` to send a PING message to the bootnode.
- Press `n` to send a FINDNODES message to the bootnode
- Press `e` to print the Ultralight-CLI node's current ENR
- Press `ctrl+c` to terminate the node