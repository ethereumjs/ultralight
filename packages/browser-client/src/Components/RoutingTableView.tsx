import React from 'react'
import { ENR } from 'portalnetwork'
import { CopyIcon } from '@chakra-ui/icons'
import {
  Table,
  Box,
  Center,
  TableCaption,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Tooltip,
} from '@chakra-ui/react'

interface RoutingTableViewProps {
  peers: ENR[] | undefined
  sortedDistList: [number, string[]][]
}

export default function RoutingTableView(props: RoutingTableViewProps) {
  return (
    <Center>
      <Box width={'90%'} maxHeight="40%">
        <Center>
          <Table size="xs">
            <TableCaption>Peers: {props.peers?.length}</TableCaption>
            <Thead>
              <Tr>
                <Th>ENR</Th>
                <Th>DIST</Th>
                <Th>IP</Th>
                <Th>PORT</Th>
                <Th>NodeId</Th>
              </Tr>
            </Thead>
            <Tbody>
              {props.sortedDistList.map((peer) => {
                return (
                  <Tr key={peer[1][2]}>
                    <Td key={peer[1][2] + 'abc'}>
                      <Tooltip label={peer[1][3]}>
                        <CopyIcon
                          cursor={'pointer'}
                          onClick={() => navigator.clipboard.writeText(peer[1][3])}
                        />
                      </Tooltip>
                    </Td>
                    <Th>{peer[0]}</Th>
                    <Td>{peer[1][0]}</Td>
                    <Td>{peer[1][1]}</Td>
                    <Td>{peer[1][2].slice(0, 15) + '...'}</Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </Center>
      </Box>
    </Center>
  )
}
