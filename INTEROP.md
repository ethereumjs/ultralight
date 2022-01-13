# Interop instructions

## Local devnet with Fluffy and Ultralight browser and CLI clients

- Follow the Quick-Start instructions in the main [README](./README.md) to get the Ultralight clients up and running
- Build Fluffy following [these instructions](https://github.com/status-im/nimbus-eth1/tree/master/fluffy#build-fluffy-client)
- Open a terminal window in the root directory for the Fluffy repo and run `./build/fluffy --rpc --nat=extip:127.0.0.1 --bootstrap-node=[ Ultralight node's ENR here]`
- Fluffy should connect and you will start seeing logs showing `PING/PONG`
- If you add Fluffy's ENR to the browser client following the steps described in the quickstart, you can also interact with Fluffy using the various options available

## Local devnet with Trin and Ultralight

Trin doesn't support connections over local host so our setup is slightly more involved and we have to instruct our proxy to listen on our system's LAN IP address rather than on `localhost` in order to connect.

- Follow the Quick-Start instructions in the main [README](./README.md) to get the Ultralight clients up and running
- Build Trin following [these instructions](https://github.com/ethereum/trin/#install-dependencies-on-ubuntudebian)
- Open a terminal window in the root directory for the Trin repo and run `RUST_LOG=debug TRIN_INFURA_PROJECT_ID="YoUr-Id-HeRe" cargo run -p trin -- --internal-ip`
- Trin will print something like below.  Copy the string after `encoded=`
```sh
Jan 13 10:41:35.899  INFO trin_core::portalnet::discovery: Starting discv5 with local enr encoded=enr:-IS4QJ70AtfgjKpumdedZ7BxiCTUkserJTZl8C_MBZCg0WZBYtnYkKuaMSWz_xMwvl-4vIsVn-8llHcHJ1hMVY04MdABgmlkgnY0gmlwhMCoAMKJc2VjcDI1NmsxoQNgBeJl1o_wEPJ_Zoy2pmqSXTx3Jkpyu9hN7yTmbGvzWYN1ZHCCIyg decoded=ENR: NodeId: 0x364d..72f9, Socket: Some(192.168.0.194:9000)  
```
- Run `npm run start -- --nat lan --ip [your LAN IP address here]` from the `proxy` package directory
- Start the Ultralight browser client
- Type your PC's LAN IP address in the "Proxy IP Address" and press start node
- Paste the Trin ENR in the `Node ENR` input and then press Add Node and then you can interact with the Trin node.  

## Connecting with public Trin bootnodes

- Copy one of the [trin public bootnode ENRs](https://github.com/ethereum/portal-network-specs/blob/master/testnet.md)
- Start the CLI client using this command `npm run start -w=cli -- --proxy --nat=extip --bootnode=[trin bootnode enr]`
- Once the client starts, press `p` to send a PING message to the bootnode.
- Press `n` to send a FINDNODES message to the bootnode
- Press `e` to print the Ultralight-CLI node's current ENR
- Press `ctrl+c` to terminate the node