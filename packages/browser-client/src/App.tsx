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
      await state.provider?.historyProtocol.addBootNode(state.searchEnr)
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
    state.provider?.portal.enableLog('*Portal*')
  }, [])

  return (
    <ChakraProvider theme={theme}>
      {state && state.provider && state.provider.historyProtocol && (
        <AppContext.Provider value={{ state, dispatch }}>
          <Header />
          <Divider />

          <Box>{<Layout />}</Box>
          <Box width={'100%'} pos={'fixed'} bottom={'0'} bg="whiteAlpha.200" opacity={1}>
            <Center>
              <Footer />
            </Center>
          </Box>
        </AppContext.Provider>
      )}
    </ChakraProvider>
  )
}
