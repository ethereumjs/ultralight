import { createContext, useContext, useReducer } from 'react'
import { TMutations } from './ClientContext'
import { trpc } from '../utils/trpc'

export const RPCDispatchContext = createContext<any>(null)

export const wsMethods = {
  pingBootNodes: trpc.pingBootNodes,
  discv5_nodeInfo: trpc.browser_nodeInfo,
  portal_historyPing: trpc.ping,
  portal_historyRoutingTableInfo: trpc.local_routingTable,
  portal_historyFindNodes: trpc.browser_historyFindNodes,
  portal_historyFindContent: trpc.browser_historyFindContent,
  portal_historyRecursiveFindContent: trpc.browser_historyRecursiveFindContent,
  portal_historyOffer: trpc.browser_historyOffer,
  portal_historySendOffer: trpc.browser_historySendOffer,
  portal_historyGossip: trpc.browser_historyGossip,
  eth_getBlockByHash: trpc.browser_ethGetBlockByHash,
  eth_getBlockByNumber: trpc.browser_ethGetBlockByNumber,
}

export const httpMethods = {
  pingBootNodes: trpc.pingBootNodeHTTP,
  discv5_nodeInfo: trpc.discv5_nodeInfo,
  portal_historyPing: trpc.portal_historyPing,
  portal_historyRoutingTableInfo: trpc.portal_historyRoutingTableInfo,
  // portal_historyFindNodes: trpc.portal_historyFindNodes,
  // portal_historyFindContent: trpc.portal_historyFindContent,
  // portal_historyRecursiveFindContent: trpc.portal_historyRecursiveFindContent,
  // portal_historyOffer: trpc.portal_historyOffer,
  // portal_historySendOffer: trpc.portal_historySendOffer,
  // portal_historyGossip: trpc.portal_historyGossip,
  // eth_getBlockByHash: trpc.portal_ethGetBlockByHash,
  // eth_getBlockByNumber: trpc.portal_ethGetBlockByNumber,

  // TODO: uncomment above and delete below once implemented
  portal_historyFindNodes: trpc.browser_historyFindNodes,
  portal_historyFindContent: trpc.browser_historyFindContent,
  portal_historyRecursiveFindContent: trpc.browser_historyRecursiveFindContent,
  portal_historyOffer: trpc.browser_historyOffer,
  portal_historySendOffer: trpc.browser_historySendOffer,
  portal_historyGossip: trpc.browser_historyGossip,
  eth_getBlockByHash: trpc.browser_ethGetBlockByHash,
  eth_getBlockByNumber: trpc.browser_ethGetBlockByNumber,
}
export type WSMethods = typeof wsMethods
export type HttpMethods = typeof httpMethods
export type TMethods = WSMethods | HttpMethods

interface IRPCInitialState {
  PORT: number
  IP?: string
  CONTENT_KEY: string
  CONTENT: string
  CONTENT_KEY_ARRAY: string[]
  ENR: string
  NODEID: string
  DISTANCES: number[]
  BLOCK_HASH: string
  BLOCK_NUMBER: string
  CURRENT_LOG: {
    request: string | undefined
    response: string | undefined
  }
  REQUEST: TMethods
}

export const RPCInitialState: IRPCInitialState = {
  PORT: 8545,
  CONTENT_KEY: '',
  CONTENT: '',
  CONTENT_KEY_ARRAY: [],
  ENR: '',
  NODEID: '',
  DISTANCES: [],
  BLOCK_HASH: '',
  BLOCK_NUMBER: '',
  CURRENT_LOG: {
    request: undefined,
    response: undefined,
  },
  REQUEST: wsMethods,
}
export const RPCContext = createContext(RPCInitialState)

export function RPCReducer(state: any, action: any) {
  switch (action.type) {
    case 'PORT': {
      return {
        ...state,
        PORT: action.port,
      }
    }
    case 'IP': {
      return {
        ...state,
        IP: action.ip,
      }
    }
    case 'RPC_ADDR': {
      return {
        ...state,
        PORT: action.port,
        IP: action.ip,
      }
    }
    case 'CONTENT_KEY': {
      return {
        ...state,
        CONTENT_KEY: action.contentKey,
      }
    }
    case 'CONTENT': {
      return {
        ...state,
        CONTENT: action.content,
      }
    }
    case 'CONTENT_KEY_ARRAY': {
      return {
        ...state,
        CONTENT_KEY_ARRAY: action.contentKeyArray,
      }
    }
    case 'ENR': {
      return {
        ...state,
        ENR: action.enr,
      }
    }
    case 'NODEID': {
      return {
        ...state,
        NODEID: action.nodeId,
      }
    }
    case 'DISTANCES': {
      return {
        ...state,
        DISTANCES: action.distances,
      }
    }
    case 'BLOCK_HASH': {
      return {
        ...state,
        BLOCK_HASH: action.blockHash,
      }
    }
    case 'BLOCK_NUMBER': {
      return {
        ...state,
        BLOCK_NUMBER: action.blockNumber,
      }
    }
    case 'CURRENT_REQUEST': {
      return {
        ...state,
        CURRENT_LOG: {
          ...state.CURRENT_LOG,
          request: action.request,
        },
      }
    }
    case 'CURRENT_RESPONSE': {
      return {
        ...state,
        CURRENT_LOG: {
          ...state.CURRENT_LOG,
          response: action.response,
        },
      }
    }
    default: {
      throw Error('Unknown action: ' + action.type)
    }
  }
}

export function RPCProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(RPCReducer, RPCInitialState)
  return (
    <RPCContext.Provider value={state}>
      <RPCDispatchContext.Provider value={dispatch}>{children}</RPCDispatchContext.Provider>
    </RPCContext.Provider>
  )
}

export function useRPC() {
  const context = useContext(RPCContext)
  return context
}
