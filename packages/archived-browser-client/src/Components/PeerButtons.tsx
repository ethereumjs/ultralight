import { Box, Button, Divider, HStack, VStack } from '@chakra-ui/react'
import React, { useContext, useEffect } from 'react'
import { AppContext, AppContextType, StateChange } from '../globalReducer'
import { PeerActions } from '../peerActions'
import { PeerContext, PeerContextType } from '../peerReducer'
import PeerInfo from './PeerInfo'
import PortalButtons from './PortalButtons'

export default function PeerButtons() {
  const { state, dispatch } = useContext(AppContext as React.Context<AppContextType>)
  const { peerState, peerDispatch } = useContext(PeerContext as React.Context<PeerContextType>)

  const peerActions = new PeerActions(
    {
      peerState,
      peerDispatch,
    },
    state.provider!.historyProtocol
  )

  useEffect(() => {
    if (state.peers.length > 0) {
      if (!state.selectedPeer) {
        dispatch({ type: StateChange.SETSELECTEDPEER, payload: { idx: 0 } })
      }
    }
  }, [])

  const peerIdx = state.sortedPeers
    .map((peer) => {
      return peer[1][3]
    })
    .indexOf(state.selectedPeer)

  return (
    <Box border="1px" height="100%">
      {true && (
        <VStack>
          <HStack width="100%" alignItems={'center'}>
            <Box width="66%">
              <PeerInfo peerIdx={peerIdx} />
            </Box>
            <Box width="33%">
              <Button
                disabled={state.peers.length < 1}
                boxShadow={'xl'}
                rounded={'none'}
                width="100%"
                size="md"
                onClick={() => peerActions.handlePing(state.selectedPeer)}
                bgColor={peerState.ping[0]}
              >
                {peerState.ping[1]}
              </Button>
            </Box>
          </HStack>
          <Divider />
          <PortalButtons />
        </VStack>
      )}
    </Box>
  )
}
