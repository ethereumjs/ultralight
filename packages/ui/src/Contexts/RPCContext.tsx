import { createContext, useContext, useReducer } from 'react'

export const RPCDispatchContext = createContext<any>(null)

interface IRPCInitialState {
  CONTENT_KEY: string
  CONTENT: string
  CONTENT_KEY_ARRAY: string[]
  ENR: string
  NODEID: string
  DISTANCES: number[]
  BLOCK_HASH: string
  BLOCK_NUMBER: string
}

export const RPCInitialState: IRPCInitialState = {
  CONTENT_KEY: '',
  CONTENT: '',
  CONTENT_KEY_ARRAY: [],
  ENR: '',
  NODEID: '',
  DISTANCES: [],
  BLOCK_HASH: '',
  BLOCK_NUMBER: '',
}
export const RPCContext = createContext(RPCInitialState)

export function RPCReducer(state: any, action: any) {
  switch (action.type) {
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
