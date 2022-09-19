import React from 'react'

export interface PeerState {
  epoch: number
  offer: Uint8Array[]
  ping: [string, string]
  distance: string
  blockHash: string
  selectedPeer: string
}

export const peerInitialState = {
  epoch: 0,
  offer: [],
  ping: ['blue.100', 'PING'] as [string, string],
  distance: '',
  blockHash: '',
  selectedPeer: '',
}

export interface PeerStateAction {
  type: PeerStateChange
  payload?: any
}
export type PeerReducer = React.Reducer<PeerState, PeerStateAction>
export type ReducerState = React.ReducerState<PeerReducer>

export enum PeerStateChange {
  SETEPOCH = 'SETEPOCH',
  ADDTOOFFER = 'ADDTOOFFER',
  PING = 'PING',
  SETDISTANCE = 'SETDISTANCE',
  SETBLOCKHASH = 'SETBLOCKHASH',
  SETPEERIDX = 'SETPEERIDX',
  SETSELECTEDPEER = 'SETSELECTEDPEER',
}

export const peerReducer = (state: PeerState, action: PeerStateAction) => {
  const { type, payload } = action
  switch (type) {
    case PeerStateChange.SETEPOCH:
      return state
    case PeerStateChange.ADDTOOFFER:
      return {
        ...state,
        offer: [...state.offer, payload],
      }
    case PeerStateChange.PING:
      return { ...state, ping: payload }
    case PeerStateChange.SETDISTANCE:
      return state
    case PeerStateChange.SETBLOCKHASH:
      return { ...state, blockHash: payload }
    case PeerStateChange.SETSELECTEDPEER:
      return { ...state, selectedPeer: payload }
    default:
      throw new Error()
  }
}

export type PeerDispatch = React.Dispatch<PeerStateAction>
export type PeerReducerType = { dispatch: PeerDispatch }

export type PeerContextType = {
  state?: PeerState
  dispatch?: PeerDispatch
}

export const PeerContext = React.createContext<PeerContextType>({})
