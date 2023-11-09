import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Center,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

export default function PortalInfo() {
  const blurbs: Record<string, string[]> = {
    'What is the Portal Network?': [
      `The Portal Network is an in progess effort to enable lightweight network access by resource constrained devices. The term "portal" is used to indicate that these networks provide a view into the network but are not critical to the operation of the core Ethereum network.`,
      `The Portal Network is comprised of multiple peer-to-peer networks which together provide the data and functionality necessary to expose the standard JSON-RPC API. These networks are specially designed to ensure that clients participating in these networks can do so with minimal expenditure of networking bandwidth, CPU, RAM, and HDD resources.`,
    ],
    'What is a Portal Client?': [
      `The term 'Portal Client' describes a piece of software which participates in these networks. Portal Clients typically expose the standard JSON-RPC API.`,
    ],
    'History Network': [
      `The History Network facilitates on-demand retrieval of the history of the Ethereum chain. This includes:`,
      `Headers`,
      `Block bodies`,
      `Receipts`,
    ],
    'State Network': [
      'The State Network facilitates on-demand retrieval of the Ethereum "state" data. This includes:',

      'Reading account balances or nonce values',
      'Retrieving contract code',
      'Reading contract storage values',
    ],
    'Canonical Indices Network': [
      'The Canonical Indices Network is a pair of indices enabling faster access to transactions and blocks. It includes:',

      'An index which maps each transaction hash to the block within which the transaction was included',
      'An index which maps each block number to the hash of the canonical block with that number',
      'Transaction information returned from this network includes a merkle proof against the Header.transactions_trie for validation purposes.',

      'Block number information returned from this network includes a merkle proof against the header accumulator.',
    ],
    'Transaction Gossip Network': [
      'The Transaction Gossip Network facilitates broadcasting new transactions for inclusion in a future block.',
      'Nodes in this network must be able to limit how much of the transaction pool they wish to process and gossip.',
      'The goal of the transaction gossip network is to make sure nodes can broadcast transaction such that they are made available to miners for inclusion in a future block.',
      "Transactions which are part of this network's gossip are able to be validated without access to the Ethereum state. This is accomplished by bundling a proof which includes the account balance and nonce for the transaction sender. This validation is required to prevent DOS attacks.",
      'This network is a pure gossip network and does not implement any form of content lookup or retrieval.',
    ],
    'Header Gossip Network': [
      'The Header Gossip Network faciliates tracking and following the canonical chain of block headers.',
      "A double batched merkle log accumulator is used to minimize storage overhead while still allowing nodes to verify the historical headers without requiring nodes to store the full history. The network also exposes functionality to allow new nodes joining the network to acquire a copy of another node's accumulator.",
    ],
  }

  const md = `
  # Title
  
  ## Other Title`

  return (
    <Accordion allowToggle>
      <Center>
        <Link
          fontSize={'small'}
          color="blue"
          href="https://github.com/ethereum/portal-network-specs"
        >
          Specs on Github
        </Link>
      </Center>
      {Object.entries(blurbs).map(([topic, blurb]) => {
        return (
          <AccordionItem key={topic} padding={0}>
            <AccordionButton padding={0}>
              <Box fontSize={'x-small'}>{topic}</Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel>
              <VStack>
                {blurb.map((t) => {
                  return (
                    <Text key={t} fontSize={'x-small'}>
                      {t}
                    </Text>
                  )
                })}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
