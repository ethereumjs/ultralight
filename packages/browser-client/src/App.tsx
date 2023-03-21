import * as React from 'react'
import { useReducerAsync } from 'use-reducer-async'
import { theme, Box, Divider, ChakraProvider, VStack } from '@chakra-ui/react'
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
  React.useEffect(() => {
    state.provider?.portal.enableLog('*Portal*')
  }, [state.provider])

  return (
    <VStack spacing={0} overflow="hidden" height="99vh" width="100%">
      <ChakraProvider theme={theme}>
        {state && state.provider && state.provider.historyProtocol && (
          <AppContext.Provider value={{ state, dispatch }}>
            <Box height="10%" width="100%">
              <Header />
            </Box>

            <Divider />
            <Box width={'100%'} height="86%" bg="whiteAlpha.200" opacity={1}>
              <Layout />
            </Box>
            <Box bg="gray.500" padding={0} width={'100%'} height="3%" opacity={1}>
              <Footer />
            </Box>
          </AppContext.Provider>
        )}
      </ChakraProvider>
    </VStack>
  )
}
