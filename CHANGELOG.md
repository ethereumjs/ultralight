# 0.6.7 - (2022-01-20)

### Features

- Refresh implementation [#155](https://github.com/ChainSafe/discv5/pull/155)

# 0.6.6 - (2021-11-15)

### Features

- Bound AddrVotes data structure [#152](https://github.com/ChainSafe/discv5/pull/152)
- Add talkresp back [#149](https://github.com/ChainSafe/discv5/pull/149)

# 0.6.5 - (2021-11-04)

### Features

- Convert `broadcastTalkReq` to return promise [#136](https://github.com/ChainSafe/discv5/pull/136)
- Query multiple distance at once in lookups [#143](https://github.com/ChainSafe/discv5/pull/143)
- AddrVotes: Fix timeout map [#144](https://github.com/ChainSafe/discv5/pull/144)
- Cache enr node id [#147](https://github.com/ChainSafe/discv5/pull/147)
- Add lookup count metric [#138](https://github.com/ChainSafe/discv5/pull/138)
- Add findRandomNode method [#137](https://github.com/ChainSafe/discv5/pull/137)

# 0.6.4 - (2021-09-02)

### Chores

- Bump libp2p deps for uint8arrays@3.0.0 [#134](https://github.com/ChainSafe/discv5/pull/134)

# 0.6.3 - (2021-08-04)

### Chores

- Update multiaddr dep  ([611afd](https://github.com/ChainSafe/discv5/commit/611afd))

# 0.6.2 - (2021-07-27)

- Make searchInterval optional, handle infinity case ([079796](https://github.com/ChainSafe/discv5/commit/079796))
- Add metrics ([da78f5](https://github.com/ChainSafe/discv5/commit/da78f5))
- Add search interval to libp2p discovery module ([2e2f62](https://github.com/ChainSafe/discv5/commit/2e2f62))
- Optimize enr getLocationMultiaddr ([babb2a](https://github.com/ChainSafe/discv5/commit/babb2a))
- Optimize createPeerIdFromKeypair ([f534f5](https://github.com/ChainSafe/discv5/commit/f534f5))

# 0.6.1 - (2021-07-23)

### Features

- Add TALKREQ/TALKRESP support ([277c79](https://github.com/ChainSafe/discv5/commit/277c79))

# 0.6.0 - (2021-05-04)

### Chores

- Add strictNullChecks to tsconfig ([7f2d5e](https://github.com/ChainSafe/discv5/commit/7f2d5e))

### BREAKING CHANGES

- new multiaddr used with different API ([f0c70c](https://github.com/ChainSafe/discv5/commit/f0c70c))

# 0.5.1 - (2021-03-29)

### Chores

- Convert stray Uint8Array to Buffer ([4eb0fc](https://github.com/ChainSafe/discv5/commit/4eb0fc))
- Update bcrypto ([c6f08b](https://github.com/ChainSafe/discv5/commit/c6f08b))

# 0.5.0 - (2020-11-19)

### BREAKING CHANGES

- Initial discv5.1 update ([05ba82](https://github.com/ChainSafe/discv5/commit/05ba82))

# 0.4.2 - (2020-09-27)

### Bugfixes

- Fix multiaddr port after decoding ([d81ac3](https://github.com/ChainSafe/discv5/commit/d81ac3))

# 0.4.1 - (2020-09-22)

### Bugfixes

- New multiaddr 0.8.0: use toBytes() instead of toBuffer() ([f16aa1](https://github.com/ChainSafe/discv5/commit/f16aa1))

# 0.4.0 - (2020-09-08)

### Chores

- Update dependencies ([83657a](https://github.com/ChainSafe/discv5/commit/83657a))

### BREAKING CHANGES

- Refactor ENR multiaddr handling ([7cf6c8](https://github.com/ChainSafe/discv5/commit/7cf6c8))

# 0.3.2 - (2020-08-25)

### Bugfixes

- Fix ENR decoding bugs found with fuzzing ([96c9bb](https://github.com/ChainSafe/discv5/commit/96c9bb))

# 0.3.1 - (2020-08-14)

### Features

- Add lookupTimeout configuration ([db6289](https://github.com/ChainSafe/discv5/commit/db6289))

### Bugfixes

- Fix kad lookup bugs in NODES response ([d95ab4](https://github.com/ChainSafe/discv5/commit/d95ab4))

# 0.3.0 - (2020-08-07)

### Features

- Add enrUpdate config field ([62eaa1](https://github.com/ChainSafe/discv5/commit/62eaa1))
- Add IDiscv5Config configurability ([64fe01](https://github.com/ChainSafe/discv5/commit/64fe01))
- Add ENR getters/setters ([7dac2f](https://github.com/ChainSafe/discv5/commit/7dac2f))

### BREAKING CHANGES

- Discv5.create now has a single object param ([64fe01](https://github.com/ChainSafe/discv5/commit/64fe01))

# 0.2.7 - (2020-08-04)

### Features

- Emit to libp2p on "discovered" event ([dd76a9](https://github.com/ChainSafe/discv5/commit/dd76a9))

# 0.2.6 - (2020-08-03)

### Bugfixes

- Fix IPv4-as-IPv6 handling ([d8d0d1](https://github.com/ChainSafe/discv5/commit/d8d0d1))
- Fix ethemeral pubkey encoding ([a774fc](https://github.com/ChainSafe/discv5/commit/a774fc))

# 0.2.5 - (2020-07-06)

### Bugfixes

- Fix libp2p peer event ([489b89](https://github.com/ChainSafe/discv5/commit/489b89))

# 0.2.4 - (2020-06-24)

### Chores

- Add build to prepublishOnly script ([23f1c7](https://github.com/ChainSafe/discv5/commit/23f1c7))

# 0.2.3 - (2020-06-24) INVALID/DEPRECATED

### Bugfixes

- Add validations to ENR verification ([f5c53f](https://github.com/ChainSafe/discv5/commit/f5c53f))

## 0.2.2 - (2020-05-21)

### Bugfixes

- Fix startup bugs in libp2p compat ([55b2de](https://github.com/ChainSafe/discv5/commit/55b2de))

## 0.2.1 - (2020-05-07)

### Features

- allow enr input as a string ([840573](https://github.com/ChainSafe/discv5/commit/840573))

## 0.2.0 - (2020-04-24)

### Chores

- chore: use new peer-discovery interface ([9950fb](https://github.com/ChainSafe/discv5/commit/9950fb))

### BREAKING CHANGES

BREAKING CHANGE: emitted peer event now emits a peer data object with id and multiaddrs instead of a peer-info

## 0.1.3 - (2020-05-21)

### Bugfixes

- Fix startup bugs in libp2p compat ([ae97fa](https://github.com/ChainSafe/discv5/commit/ae97fa))

## 0.1.2 - (2020-05-07)

- allow enr input as a string ([852129](https://github.com/ChainSafe/discv5/commit/852129))

## 0.1.1 - (2020-04-10)

- add libp2p peer-discovery compatibility module ([1cf660](https://github.com/ChainSafe/discv5/commit/1cf660))

## 0.1.0 - (2020-04-06)

- initial release
