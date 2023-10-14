import { createContext, useContext, useReducer } from 'react'
import { trpc } from '../utils/trpc'

export const ClientDispatchContext = createContext<any>(null)

export const mutations = {
  ws: {
    pingBootNodes: trpc.pingBootNodes,
    portal_historyPing: trpc.ping,
    portal_historyRoutingTableInfo: trpc.browser_localRoutingTable,
    portal_historyFindNodes: trpc.browser_historyFindNodes,
    portal_historyFindContent: trpc.browser_historyFindContent,
    portal_historyRecursiveFindContent: trpc.browser_historyRecursiveFindContent,
    portal_historyOffer: trpc.browser_historyOffer,
    portal_historySendOffer: trpc.browser_historySendOffer,
    portal_historyGossip: trpc.browser_historyGossip,
    eth_getBlockByHash: trpc.browser_ethGetBlockByHash,
    eth_getBlockByNumber: trpc.browser_ethGetBlockByNumber,
  },
  http: {
    pingBootNodes: trpc.pingBootNodeHTTP,
    local_routingTable: trpc.local_routingTable,
    discv5_nodeInfo: trpc.discv5_nodeInfo,
    portal_historyGetEnr: trpc.portal_historyGetEnr,
    portal_historyRoutingTableInfo: trpc.portal_historyRoutingTableInfo,
    portal_historyPing: trpc.portal_historyPing,
    // portal_historyFindNodes: trpc.portal_historyFindNodes,
    // portal_historyFindContent: trpc.portal_historyFindContent,
    // portal_historyRecursiveFindContent: trpc.portal_historyRecursiveFindContent,
    // portal_historyOffer: trpc.portal_historyOffer,
    // portal_historySendOffer: trpc.portal_historySendOffer,
    // portal_historyGossip: trpc.portal_historyGossip,
  },
}

export type TMutations = typeof mutations

interface IClientInitialState {
  NODE_INFO: {
    tag: string
    enr: string
    nodeId: string
    multiAddr: string
  }
  CONNECTED: boolean
  CONNECTION: 'http' | 'ws'
  ROUTING_TABLE: {
    [key: number]: [string, string, string, string, number]
  }
  SELECTED_PEER: string
  OUTGOING_ENR: string
  BOOTNODES: Record<
    string,
    {
      idx: number
      client: string
      enr: string
      connected: boolean
    }
  >
  SUBSCRIPTION_LOGS: {
    [key: string]: {
      [key: string]: string[]
    }
  }
  RECEIVED_LOGS: {
    [key: string]: {
      [key: string]: string[]
    }
  }
  SENT_LOGS: {
    [key: string]: {
      [key: string]: string[]
    }
  }
  CONTENT_STORE: {
    [key: string]: {
      type: string
      added: string
    }
  }

  RPC: TMutations
}

export const ClientInitialState: IClientInitialState = {
  NODE_INFO: {
    tag: '',
    enr: '',
    nodeId: '',
    multiAddr: '',
  },
  CONNECTION: 'ws',
  CONNECTED: false,
  ROUTING_TABLE: {},
  SELECTED_PEER: '',
  OUTGOING_ENR: '',
  BOOTNODES: {},
  SUBSCRIPTION_LOGS: {},
  RECEIVED_LOGS: {},
  SENT_LOGS: {},
  CONTENT_STORE: {},
  RPC: mutations,
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
    case 'SET_CONNECTION': {
      return {
        ...state,
        CONNECTION: action.connection,
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
        BOOTNODES: action.bootnodes,
      }
    }
    case 'CONNECT_BOOTNODE': {
      return {
        ...state,
        BOOTNODES: {
          ...state.BOOTNODES,
          [action.nodeId]: {
            ...state.BOOTNODES[action.nodeId],
            connected: true,
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
      if (!state.SUBSCRIPTION_LOGS[action.nodeId]) {
        state.SUBSCRIPTION_LOGS[action.nodeId] = {}
      }
      if (!state.SUBSCRIPTION_LOGS[action.nodeId][action.topic]) {
        state.SUBSCRIPTION_LOGS[action.nodeId][action.topic] = []
      }
      return {
        ...state,
        SUBSCRIPTION_LOGS: {
          ...state.SUBSCRIPTION_LOGS,
          [action.nodeId]: {
            ...state.SUBSCRIPTION_LOGS[action.nodeId],
            [action.topic]: [...state.SUBSCRIPTION_LOGS[action.nodeId][action.topic], action.log],
          },
        },
      }
    }
    case 'LOG_RECEIVED': {
      if (!state.RECEIVED_LOGS[action.nodeId]) {
        state.RECEIVED_LOGS[action.nodeId] = {}
      }
      if (!state.RECEIVED_LOGS[action.nodeId][action.topic]) {
        state.RECEIVED_LOGS[action.nodeId][action.topic] = []
      }
      return {
        ...state,
        RECEIVED_LOGS: {
          ...state.RECEIVED_LOGS,
          [action.nodeId]: {
            ...state.RECEIVED_LOGS[action.nodeId],
            [action.topic]: [...state.RECEIVED_LOGS[action.nodeId][action.topic], action.log],
          },
        },
      }
    }
    case 'LOG_SENT': {
      if (!state.SENT_LOGS[action.nodeId]) {
        state.SENT_LOGS[action.nodeId] = {}
      }
      if (!state.SENT_LOGS[action.nodeId][action.topic]) {
        state.SENT_LOGS[action.nodeId][action.topic] = []
      }
      return {
        ...state,
        SENT_LOGS: {
          ...state.SENT_LOGS,
          [action.nodeId]: {
            ...state.SENT_LOGS[action.nodeId],
            [action.topic]: [...state.SENT_LOGS[action.nodeId][action.topic], action.log],
          },
        },
      }
    }
    case 'CONTENT_STORE': {
      return {
        ...state,
        CONTENT_STORE: {
          ...state.CONTENT_STORE,
          [action.contentKey]: {
            type: action.content.type,
            added: action.content.added,
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
