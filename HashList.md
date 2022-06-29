# HashArray -- Proposed block index sharing for Canonical Indices

## Types

- `EpochAccumulator`
    -   `List[HeaderRecord, 8192]`
- `HistoricalEpochs`
    -   `List[EpochRoot, 8192]`
- **`EpochRoot`**
    -   `Bytes32`
    -   `var` **`EpochRoot`** `=` `EpochAccumulator.hashTreeRoot`
- `HashArray`
    -   `Vector[BlockHash, 8192]`
- `HashArrayWithProof`
    -   `Container[array: HashArray, proof: EpochRoot]`
- `HashArrayRequestKey`
    -   `Vector[BlockNumber, 8192]`
- **`RequestKey`**
    -   `Bytes32`
    -   `var` **`RequestKey`** `=` `HashArrayRequestKey([ n, n+1, n+2, ..., n+8191 ]).hashTreeRoot`


## Request Keys

#### EpochAccumulators and HistoricalEpochs

    - An accumulator building from 0 will store as historical_epochs the root of a merkle tree ssz list of header_records.

    - A header_record is a container with a blochHash and totalDifficulty.

    - Each list is hashed when full, and then emptied.  the hash being stored in historical_epochs.  The list itself is not stored.

    - These lists correspond to blocks: [0-8191], [8192-16383], [16384-24575], and so on.

    - When a header_accumulator shapshot is shared, the only header_records accessible are in the current_Epoch (< 8192)

#### HashArray, Proof, and Universal Request Keys

- HashArray
    - When the header_accumulator has filled up a current_Epoch, and is preparing to hash it, store the hash, and empty the list, it could also extract an array of blockHashes from the current_Epoch

    - Since this is happening at the turnover point, the array will always be full (8192).

    - This array of Bytes32 blockhashes can be serialized as a HashArray `Vector[Bytes32, 8192]`

- HashArray with Proof
    - HashArrayWithProof is a container with a **HashArray** and Bytes32 hash_tree_root of the corresponding **Epoch_Accumulator***
        - ***NOT** the hash_tree_root of the HashArray
        - The same **ROOT** that is stored in the header_accumulator as a historical_epoch

- Request Key
    - Each HashArray correspond to blocks: [0-8191], [8192-16383], [16384-24575], and so on.
    - For each epoch, there is a unique array of 8192 consecutive block numbers, 
        - [8192, 8193, 8194, ..., 16383]
    - HashArrayRequestKey is a Vector[block_number, 8192]
    - The RequestKey is the Bytes32 hash_tree_root of the vector that corresponds to that array of numbers.
    - The Key can be generated with no knowledge of the HashArray

- Database
    - Each HashArray is stored as 
        - *key*:  **UniversalRequestKey**( **`[...blockNumbers]`** ), 
        - *value*:  **HashArrayWithProof(**{ 
            - *array*:  **`HashArray`**, 
            - *proof*:  **`current_epoch.hash_tree_root`** }**)**


#### Proof, Requests, and Validation

- Proof List

    - When a node receives a header_accumulator snapshot, it is able to extract the block_hashes for each leaf of the **`current_epoch`**.

    - From this it can set the height of it's **`block_index`**, and fill in the last `<= 8192` block_hashes

    - Also from the snapshot, the node can extract a list of `hash_tree_roots` from the **`historical_epochs`**

    - These are the `hash_tree_roots` of **epoch_accumulators**.
        - The same `hash_tree_roots` that were stored as **`proof`** with each **`HashArray`**
    - Since each `hash_tree_root` represents a full **epoch_accumulator**, they correspond, in order, to block_numbers [0-8191], [8192-16383], etc.

- Request
    - After a node receives an accumulator_snapshot, it can build a block_index the length of the current height of the accumulator, but only the `header_records` in the **`current_Epoch`** will be accessible.
        - Therefore the first `X * 8192` block_numbers will be unindexed.
    - The node will send requests over **`Canonical Indices Network`** for the unindexed epochs using **`Universal Request Keys`**
    - The response will be a serialized **`HashArrayWithProof`**
        - Deserialized as:
            - **`block_hash`**`[]`
            - **`epoch_root`**

- Validate
    - The request was made using a UniversalRequestKey corresponding to a specific range of block_numbers.
    - We have an `epoch_root` in our proof_list that also corresponds to the same range of block_numbers.
    - We can validate the `HashArray` by comparing the `epoch_root` in the reponse to the `epoch_root` in our proof_list
    - We can also validate by randomly requesting getBlockByHash for a subset of the blockHashes, and verifying the block_numbers

- Index
    - From the `HashArray`, the node can then index the block_hashes for that range of block_numbers.


#### Storing, Sharing, and Buffered-Validation

- A node that has received a `HashArrayWithProof` can store and share it over `Canonical Indices` 
    - Even to a node that has no accumulator snapshot*, 
    - Or a node not connected to `History Network` at all*.

- Since the `RequestKey` for a `HashArray` requires no knowledge of the `HashArray`, a node can make requests for an number of `HashArrays` upon joining the network.

- ****HOWEVER***
    - Without an accumulator snapshot, or ability to request getBlockByHash, both forms of **validation** above are impossilbe.
        - The `epoch_root` that is the **`Proof`** cannot be created from the array of hashes.  
        - getBlockByHash will only work over `History Network`
    - Some amount of multiple requests would be necessary to compare the **`proofs`**
        - Otherwise we may spread a bogus proof around the network.
    - Unvalidated `HashArrays` could be indexed in a buffer, and stored with `Proof` once trusted.
        - **This guards against a malicious node serving bogus HashArrays and Proofs using**
    - Also validate by randomly requesting **`getBlockByNumber`** for a subset of the `block_numbers`.
        - **This guards against a malicious node serving valid Proofs with bogus HashArrays**