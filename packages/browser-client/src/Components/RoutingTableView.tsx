import React, { useContext } from 'react'
import { CopyIcon } from '@chakra-ui/icons'
import {
  Table,
  Center,
  TableCaption,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Tooltip,
  GridItem,
  SimpleGrid,
} from '@chakra-ui/react'
import PeerButtons from './PeerButtons'
import { AppContext, StateChange } from '../globalReducer'

export default function RoutingTableView() {
  const { state, dispatch } = useContext(AppContext)

  return (
    <Center>
      <SimpleGrid width={'100%'} columns={[1, 1, 1, 2]}>
        <PeerButtons
          peer={peer}
          setPeerIdx={setPeerIdx}
          peerIdx={peerIdx}
          sortedDistList={props.table}
        />
        <GridItem>
          <Center>
            <Table size="xs">
              <TableCaption>Peers: {peers.length}</TableCaption>
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
                {props.table.length > 0 &&
                  props.table.map((peer, idx) => {
                    return (
                      <Tr
                        key={peer[1][2]}
                        onMouseEnter={() => setHover(idx)}
                        onMouseLeave={() => {
                          setHover(undefined)
                        }}
                        onClick={() => {
                          setPeerIdx(idx)
                          _setPeer(peers[idx])
                        }}
                        backgroundColor={
                          idx === hover
                            ? 'blue.100'
                            : peerIdx === idx
                            ? 'red.100'
                            : 'whiteAlpha.100'
                        }
                      >
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
        </GridItem>
      </SimpleGrid>
    </Center>
  )
}
