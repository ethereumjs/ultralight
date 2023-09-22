import { Dispatch, createContext, useContext, useReducer } from 'react'

export const AllClientsContext = createContext(null)
export const AllClientsDispatchContext = createContext<any>(null)
export const AllClientsInitialState = {
  WSS_CLIENT: {
    client: 'ultralight',
    enr: 'enr:xxxx...',
    nodeId: '0x...',
    multiAddr: '/ip4/xxx.xxx.xx.xx/udp/xxxx'
  },
  HTTP_CLIENTS: {
    8545: {
      client: 'ultralight',
      enr: 'enr:xxxx...',
      nodeId: '0x...',
      multiAddr: '/ip4/xxx.xxx.xx.xx/udp/xxxx',
    },
  },
}

export function AllClientsReducer(clients: any, action: any) {
  switch (action.type) {
    case 'WSS_INFO': {
      return {
        ...clients,
        WSS_CLIENT: {
          client: action.client,
          enr: action.enr,
          nodeId: action.nodeId,
          multiAddr: action.multiAddr,
        },
      }
    }
    case 'HTTP_INFO': {
      return {
        ...clients,
        HTTP_CLIENTS: {
          ...clients.HTTP_CLIENTS,
          [action.port]: {
            tag: action.tag,
            enr: action.enr,
            nodeId: action.nodeId,
            multiAddr: action.multiAddr,
          },
        },
      }
    }
    default: {
      throw Error('Unknown action: ' + action.type)
    }
  }
}

export function ALLClientsProvider({ children }: { children: React.ReactNode }) {
  const [clients, dispatch] = useReducer(AllClientsReducer, AllClientsInitialState)
  return (
    <AllClientsContext.Provider value={clients}>
      <AllClientsDispatchContext.Provider value={dispatch}>
        {children}
      </AllClientsDispatchContext.Provider>
    </AllClientsContext.Provider>
  )
}

export function useClients() {
  return useContext(AllClientsContext)
}

export function useClientsDispatch() {
  return useContext(AllClientsDispatchContext)
}

