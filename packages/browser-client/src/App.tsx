import * as React from 'react'
import { useReducerAsync } from 'use-reducer-async'
import {
  theme,
  Button,
  Box,
  Center,
  Divider,
  ChakraProvider,
  HStack,
  Input,
} from '@chakra-ui/react'
import Layout from './Components/Layout'
import Footer from './Components/Footer'
import Header from './Components/Header'
import {
  AppContext,
  asyncActionHandlers,
  initialState,
  reducer,
  StateChange,
} from './globalReducer'
export const lightblue = theme.colors.blue[100]
export const mediumblue = theme.colors.blue[200]

export const App = () => {
  const [state, dispatch] = useReducerAsync(reducer, initialState, asyncActionHandlers)

  async function connectToPeer() {
    try {
      await state.historyProtocol?.addBootNode(state.searchEnr)
      dispatch({ type: StateChange.SETSEARCHENR, payload: '' })
      dispatch({ type: StateChange.REFRESHPEERS })
    } catch (err) {}
  }

  const init = async () => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist()
    }
    if (process.env.BINDADDRESS) {
      dispatch({
        type: StateChange.CREATENODEFROMBINDADDRESS,
        payload: { state: state },
      })
    } else {
      dispatch({ type: StateChange.CREATENODE, payload: { state: state } })
    }
  }

  React.useEffect(() => {
    init()
  }, [])

  return (
    <ChakraProvider theme={theme}>
      {portal && (
        <PortalContext.Provider value={portal}>
          <Header enr={portal.discv5.enr.encodeTxt(portal.discv5.keypair.privateKey)} />
          {historyProtocol !== undefined && (
            <>
              <HStack border={'1px'} width={'100%'} paddingY={1}>
                <Button width={'25%'} bgColor={'blue.100'} size={'xs'} onClick={connectToPeer}>
                  Connect to new peer
                </Button>
                <Input
                  width={'75%'}
                  size={'xs'}
                  type="text"
                  placeholder={'enr:IS...'}
                  value={peerEnr}
                  onChange={(e) => {
                    setPeerEnr(e.target.value)
                  }}
                />
              </HStack>
              <Divider />

              <Box>
                <HistoryProtocolContext.Provider value={historyProtocol}>
                  <PeersContext.Provider value={peers}>
                    <BlockContext.Provider value={blockValue}>
                      <Layout
                        peers={peers.length > 0}
                        refresh={updateAddressBook}
                        table={sortedDistList}
                      />
                    </BlockContext.Provider>
                  </PeersContext.Provider>
                </HistoryProtocolContext.Provider>
              </Box>
            </>
          )}
          <Box width={'100%'} pos={'fixed'} bottom={'0'}>
            <Center>
              <Footer />
            </Center>
          </Box>
          <Modal isOpen={modalStatus} onClose={() => setModal(false)}>
            <ModalOverlay />
            <ModalContent>
              <InfoMenu />
            </ModalContent>
          </Modal>
        </PortalContext.Provider>
      )}
    </ChakraProvider>
  )
}
