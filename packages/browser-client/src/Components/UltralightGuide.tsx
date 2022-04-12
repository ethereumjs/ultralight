import { ListItem, UnorderedList, VStack } from '@chakra-ui/react'
import React from 'react'
export default function UltralightGuide() {
  return (
    <UnorderedList>
      <ListItem>This browser or mobile app is a live Portal Network Node</ListItem>
      <ListItem>Nodes find eachother using an Ethereum Node Record like an address</ListItem>
      <ListItem>Connect to another node by entering in that node's ENR.</ListItem>
      <ListItem>Copy and share your ENR in the Dev Tools menu</ListItem>
      <ListItem>Connected nodes are stored in a Routing Table</ListItem>
      <ListItem>The "Network" display will update as the routing table is populated</ListItem>
      <ListItem>Enter a blockhash to search the History Network</ListItem>
      <ListItem>The returned block data will be displayed in the block explorer.</ListItem>
      <ListItem>
        Use the Dev Tools Menu to manually interact with the network and load block data
      </ListItem>
    </UnorderedList>
  )
}
