# Database Architecture

Ultralight used [`LevelDB`](https://github.com/google/leveldb) to manage data storage.

## Interacting with the DB

The `portalnetwork` module exposes a `DBManager` class as `portalnetwork.db` that manages all database operations.  This class exposes the standard `level` API for db transactions (`get`, `put`, `del`, `batch`) and also exposes a `currentSize` property that provides an estimated DB size in megabytes to allow content handlers within each protocol decide when to store data locally based on space currently available and whether the content falls within the node's radius.  

## Data stored in the DB

All data is currently stored with `string` keys and hex-encoded `string` values.  Below is a rough schema of all data currently stored in the DB.  

### Node data

Node identity and routing table information is stored in the db when the `portalnetwork.storeNodeInfo` method is called.  This data can then be used to re-establish the node's ENR record and routing table on next start-up.

#### Elements stored

`enr` - hex-encoded bytes for ENR
`peerId` - hex-encoded bytes for node's peer-id
`peers` - a stringified JSON array containing the base64 encoded ENRs of all peers in all subprotocol routing tables

### History Network

Block headers and block bodies are currently stored separately by their `contentId`

#### Elements stored

`contentId` - hex-encoded bytes corresponding to content
