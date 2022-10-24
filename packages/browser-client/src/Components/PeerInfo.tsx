import { CopyIcon } from '@chakra-ui/icons'
import { VStack, Heading, Table, Tbody, Tr, Td, Th, Tooltip, Text } from '@chakra-ui/react'
import { shortId, ENR } from 'portalnetwork'
import React, { useContext } from 'react'
import { AppContext, AppContextType } from '../globalReducer'

export default function PeerInfo(props: { peerIdx: number }) {
  const peerIdx = props.peerIdx
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const info = state.sortedPeers[peerIdx]
    ? {
        label: state.sortedPeers[peerIdx][1][3],
        enr: state.selectedPeer.slice(0, 20),
        nodeId: shortId(ENR.decodeTxt(state.selectedPeer).nodeId),
        addr: `${state.sortedPeers[peerIdx][1][0]}: ${state.sortedPeers[peerIdx][1][1]}`,
      }
    : {
        label: '',
        enr: '',
        nodeId: '',
        addr: '',
      }
  return (
    <VStack boxShadow={'md'} rounded="md">
      <Table size="xs">
        {
          <Tbody fontSize={'x-small'}>
            <Tr>
              <Th>
                <Tooltip label={info.label}>
                  <CopyIcon
                    cursor={'pointer'}
                    onClick={() => navigator.clipboard.writeText(info.label)}
                  />
                </Tooltip>
              </Th>
              <Td fontSize={'x-small'}>{info.enr}...</Td>
            </Tr>
            <Tr>
              <Td>Addr: </Td>
              <Td>{info.addr}</Td>
            </Tr>
            <Tr>
              <Td>NodeId: </Td>
              <Td>{info.nodeId}</Td>
            </Tr>
          </Tbody>
        }
      </Table>
    </VStack>
  )
}
