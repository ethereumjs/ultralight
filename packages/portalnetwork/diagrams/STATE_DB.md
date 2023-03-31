# State Network Database

### DB Structure
```mermaid
classDiagram
    StateDB -- SubLevels
    StateDB -- StateRootIndex
    StateDB -- KnownAddresses

    class SubLevels {
        StateRoot > TrieLevel
    }
    SubLevels -- StateB
    SubLevels -- StateA
    SubLevels -- StateY
    SubLevels -- StateX
    class StateA {
        TrieLevel
    }
    class StateB {
        TrieLevel
    }
    class StateY {
        TrieLevel
    }
    class StateX {
        TrieLevel
    }
    class KnownAddresses {
        distance < radius
    }
    KnownAddresses -- Addr1
    KnownAddresses -- Addr2
    KnownAddresses -- Addr3
    KnownAddresses -- Addr4
    StateRootIndex <-- SubLevels
    StateRootIndex <-- KnownAddresses

    class StateRootIndex {
        sort(stateroots) [A, B, X, Y]
    }
```

### Store: AccountTrieProof 
```mermaid
flowchart TD
    Bridge[BridgeNode]
    Network[State Network] 
    StateDB{StateDB}
    ACC(Account Data)
    PROOF(Merkle Proof)
    VALID(verify)
    ATP(AccountTrieProof)
    Bridge -->|New Content| ATP
    Network -->|Gossip| ATP
    ATP --> KEY(ContentKey)
    ATP --> CON(Content)
    KEY --> ADD(Address)
    KEY --> ROOT(State Root)
    ADD --> StateDB
    ROOT --> VALID
    PROOF --> VALID
    CON --> PROOF
    CON --> ACC
    VALID --> StateDB
    ACC --> StateDB
    StateDB --> Subs[sublevels]
    Subs --> |State Root| Sub[TrieLevel]
    Sub --> |Trie.DB = TrieLevel| Trie[Trie]
    Trie --> FROM[Updated Trie]
    PROOF --> FROM
    FROM --> Subs
```

### Find Content: AccountTrieProof (account + state_root)
```mermaid
flowchart TD
    Network[State Network] 
    StateDB{StateDB}
    ACC(Account Data)
    PROOF(Merkle Proof)
    ATPK(AccountTrieProofKey)
    KEY(ContentKey)
    KEY --> ATPK
    Network -->|FindContent| KEY
    ATPK --> ADD(Address)
    ATPK --> ROOT(State Root)
    ADD --> StateDB
    ROOT --> StateDB
    StateDB --> Subs[sublevels]
    Subs --> |State Root| Sub[TrieLevel]
    Sub --> |Trie.DB = TrieLevel| Trie[Trie]
    Trie --> ACC
    Trie --> PROOF
    PROOF --> ATP[AccountTrieProof]
    ACC --> ATP
    ATP --> |Content|Network

```