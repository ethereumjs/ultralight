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
