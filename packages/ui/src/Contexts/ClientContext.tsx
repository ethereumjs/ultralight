import { createContext, useContext, useReducer } from 'react'

export const ClientDispatchContext = createContext<any>(null)

export const ClientInitialState = {
  NODE_INFO: {
    tag: 'ultralight',
    enr: 'enr:xxxx...',
    nodeId: '0x...',
    multiAddr: '/ip4/xxx.xxx.xx.xx/udp/xxxx',
  },
  CONNECTED: false,
  ROUTING_TABLE: {
    0: ['ultralight', 'enr:xxxx...', '0x...', '/ip4/xxx.xxx.xx.xx/udp/xxxx', 0],
  },
  SELECTED_PEER: {},
  OUTGOING_ENR: '',
  BOOTNODES: {
    ['0x0000']: {
      tag: 'ultralight',
      enr: 'enr:xxxx...',
      connected: 'false',
    },
  },

  SUBSCRIPTION_LOGS: {},
}
export const ClientContext = createContext(ClientInitialState)

export function ClientReducer(state: any, action: any) {
  switch (action.type) {
    case 'NODE_INFO': {
      return {
        ...state,
        NODE_INFO: {
          tag: action.tag,
          enr: action.enr,
          nodeId: action.nodeId,
          multiAddr: action.multiAddr,
        },
      }
    }
    case 'CONNECTED': {
      return {
        ...state,
        CONNECTED: true,
      }
    }
    case 'DISCONNECTED': {
      return {
        ...state,
        CONNECTED: false,
      }
    }
    case 'ROUTING_TABLE': {
      return {
        ...state,
        ROUTING_TABLE: action.routingTable,
      }
    }
    case 'BOOTNODES': {
      return {
        ...state,
        BOOTNODES: {
          ...state.BOOTNODES,
          [action.nodeId]: {
            tag: action.client,
            enr: action.enr,
            connected: action.response,
          },
        },
      }
    }
    case 'SELECT_PEER': {
      return {
        ...state,
        SELECTED_PEER: action.nodeId,
      }
    }
    case 'OUTGOING_ENR': {
      return {
        ...state,
        OUTGOING_ENR: action.enr,
      }
    }
    case 'ADD_SUBSCRIPTION': {
      return {
        ...state,
        SUBSCRIPTION_LOGS: {
          ...state.SUBSCRIPTION_LOGS,
          [action.topic]: {
            ...state.SUBSCRIPTION_LOGS[action.topic],
            [action.nodeId]: [],
          },
        },
      }
    }
    case 'DEL_SUBSCRIPTION': {
      return {
        ...state,
        SUBSCRIPTION_LOGS: {
          ...state.SUBSCRIPTION_LOGS,
          [action.topic]: {
            ...state.SUBSCRIPTION_LOGS[action.topic],
            [action.nodeId]: null,
          },
        },
      }
    }
    case 'LOG_SUBSCRIPTION': {
      return {
        ...state,
        SUBSCRIPTION_LOGS: {
          ...state.SUBSCRIPTION_LOGS,
          [action.topic]: {
            ...state.SUBSCRIPTION_LOGS[action.topic],
            [action.nodeId]: [...state.SUBSCRIPTION_LOGS[action.topic][action.nodeId], action.log],
          },
        },
      }
    }
    default: {
      throw Error('Unknown action: ' + action.type)
    }
  }
}

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ClientReducer, ClientInitialState)
  return (
    <ClientContext.Provider value={state}>
      <ClientDispatchContext.Provider value={dispatch}>{children}</ClientDispatchContext.Provider>
    </ClientContext.Provider>
  )
}

export function useClient() {
  const context = useContext(ClientContext)
  return context
}
