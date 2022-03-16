# Interop instructions

## Local devnet with Fluffy and Ultralight browser and CLI clients

- Follow the Quick-Start instructions in the main [README](./README.md) to get the Ultralight clients up and running
- Build Fluffy following [these instructions](https://github.com/status-im/nimbus-eth1/tree/master/fluffy#build-fluffy-client)
- Open a terminal window in the root directory for the Fluffy repo and run `./build/fluffy --rpc --nat=extip:127.0.0.1 --bootstrap-node=[ Ultralight node's ENR here]`
- Fluffy should connect and you will start seeing logs showing `PING/PONG`
- If you add Fluffy's ENR to the browser client following the steps described in the quickstart, you can also interact with Fluffy using the various options available

## Local devnet with Trin and Ultralight

- Follow the Quick-Start instructions in the main [README](./README.md) to get the Ultralight clients up and running
- Build Trin following [these instructions](https://github.com/ethereum/trin/#install-dependencies-on-ubuntudebian)
- Open a terminal window in the root directory for the Trin repo and run `RUST_LOG=debug TRIN_INFURA_PROJECT_ID="YoUr-Id-HeRe" cargo run -p trin -- --external-address 127.0.0.1:9000`
- Trin will print something like below.  Copy the string after `encoded=`
```sh
Jan 13 10:41:35.899  INFO trin_core::portalnet::discovery: Starting discv5 with local enr encoded=enr:-IS4QJ70AtfgjKpumdedZ7BxiCTUkserJTZl8C_MBZCg0WZBYtnYkKuaMSWz_xMwvl-4vIsVn-8llHcHJ1hMVY04MdABgmlkgnY0gmlwhMCoAMKJc2VjcDI1NmsxoQNgBeJl1o_wEPJ_Zoy2pmqSXTx3Jkpyu9hN7yTmbGvzWYN1ZHCCIyg decoded=ENR: NodeId: 0x364d..72f9, Socket: Some(127.0.0.1:9000)  
```
- Start the Ultralight browser client
- Paste the Trin ENR in the `Node ENR` input and then press Add Node and then you can interact with the Trin node.  

## Connecting with public Trin bootnodes

- Copy one of the [trin public bootnode ENRs](https://github.com/ethereum/portal-network-specs/blob/master/testnet.md)
- Start an Ultralight Node
  - CLI Client - use this command `npm run start -w=cli -- --proxy --nat=extip --bootnode=[trin bootnode enr]`
  - Browser Client
    - Start proxy using - `npm run start -w=proxy -- --nat=extip`
    - Start the browser client using `npm run start-browser-client` and use the ENR of the Trin node to connect
