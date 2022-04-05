import { ENR } from '@chainsafe/discv5'
import { CopyIcon } from '@chakra-ui/icons'
import { Table, Box, TableCaption, Thead, Th, Tbody, Tr, Td, Tooltip } from '@chakra-ui/react'

interface RoutingTableViewProps {
  peers: ENR[] | undefined
  sortedDistList: [number, string[]][]
}

export default function RoutingTableView(props: RoutingTableViewProps) {
  return (
    <Box maxHeight="40%">
      <Table size="xs">
        <TableCaption>Peers: {props.peers?.length}</TableCaption>
        <Thead>
          <Th>ENR</Th>
          <Th>DIST</Th>
          <Th>IP</Th>
          <Th>PORT</Th>
          <Th>NodeId</Th>
        </Thead>
        <Tbody>
          {props.sortedDistList.map((peer) => {
            return (
              <Tr>
                <Td>
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
    </Box>
  )
}
