import { ethers } from 'ethers'
import type { BlockWithTransactions, _Block } from '@ethersproject/abstract-provider'
import { TypedTransaction } from '@ethereumjs/tx'
import { BrowserLevel } from 'browser-level'
import {
  ENR,
  ProtocolId,
  TransportLayer,
  TxReceiptWithType,
  UltralightProvider,
} from 'portalnetwork'
import React from 'react'
import { AsyncActionHandlers } from 'use-reducer-async'
import { createNodeFromScratch, createNodeFromStorage, refresh, startUp } from './portalClient'

export type AppState = {
  proxy: string
  provider: UltralightProvider | undefined
  LDB: BrowserLevel
  //
  searchEnr: string
  peers: ENR[]
  sortedPeers: [number, string[]][]
  selectedPeer: string
  peerIdx: number
  //
  tabIndex: number
  isLoading: boolean
  hover: number | undefined
  //
  block: _Block | BlockWithTransactions | undefined
  receipts: TxReceiptWithType[]
  transaction: TypedTransaction | undefined
}

export type AppReducer = React.Reducer<AppState, AppStateAction | AsyncAction>
export type ReducerState = React.ReducerState<AppReducer>
export const initialState: ReducerState = {
  proxy: 'ws://127.0.0.1:5050',
  provider: undefined,
  LDB: new BrowserLevel('ultralight_history', { prefix: '', version: 1 }),
  searchEnr:
    'enr:-IS4QB-D7CEwWs-spOmhgmVJEfLmB9lkGEkTVpFI8U2mvTYfZLnrqYK8hfJvNZrPHYL0C3PUi83eJQZj0eAkJSGMU5oDgmlkgnY0gmlwhH8AAAGJc2VjcDI1NmsxoQMdt_9PTSG9rirm8pq9jNR46jPsf2xbcvHBwQ10kgikXoN1ZHCCE4g',
  peers: [],
  sortedPeers: [],
  selectedPeer: '',
  peerIdx: 0,
  tabIndex: 0,
  isLoading: false,
  hover: undefined,
  block: undefined,
  receipts: [],
  transaction: undefined,
}

export enum StateChange {
  CREATENODEFROMBINDADDRESS = 'CREATENODEFROMBINDADDRESS',
  CREATENODE = 'CREATENODE',
  SETPROXY = 'SETPROXY',
  SETPORTAL = 'SETPORTAL',
  REFRESHPEERS = 'REFRESHPEERS',
  SETSEARCHENR = 'SETSEARCHENR',
  SETPEERS = 'SETPEERS',
  SORTPEERS = 'SORTPEERS',
  SETSELECTEDPEER = 'SETSLELECTEDPEER',
  SETTAB = 'SETTAB',
  TOGGLELOADING = 'TOGGLELOADING',
  SETHOVER = 'SETHOVER',
  SETBLOCK = 'SETBLOCK',
  GETRECEIPTS = 'GETRECEIPTS',
  SETRECEIPTS = 'SETRECEIPTS',
}

export interface AppStateAction {
  type: StateChange
  payload?: any
}

export const reducer: React.Reducer<AppState, AppStateAction | AsyncAction> = (
  state: AppState,
  action: AppStateAction | AsyncAction
) => {
  const _state = state
  const { type, payload } = action
  switch (type) {
    case StateChange.SETPROXY:
      _state.proxy = payload
      return { ..._state }
    case StateChange.SETPORTAL:
      _state.provider = payload
      // _state.block = _state.historyProtocol.accumulator.genesisBlock
      return { ..._state }
    case StateChange.REFRESHPEERS:
      return refresh(state)
    case StateChange.SETSEARCHENR:
      _state.searchEnr = payload
      return {
        ..._state,
      }
    case StateChange.SETSELECTEDPEER:
      return {
        ...state,
        peerIdx: payload.idx,
        selectedPeer: state.sortedPeers[payload.idx][1][3],
      }
    case StateChange.SETTAB:
      return {
        ...state,
        tabIndex: payload,
      }
    case StateChange.SETHOVER:
      return {
        ...state,
        hover: payload,
      }
    case StateChange.TOGGLELOADING:
      return {
        ...state,
        isLoading: !state.isLoading,
      }
    case StateChange.SETBLOCK:
      return {
        ...state,
        block: payload,
        tabIndex: 1,
      }
    case StateChange.SETRECEIPTS:
      return {
        ...state,
        receipts: payload,
      }
    default:
      throw new Error('State Change Not Possible')
  }
}

export type reducerType = { dispatch: React.Dispatch<AppStateAction | AsyncAction> }
export type AsyncAction = {
  type: string
  payload: {
    state: AppState
  }
}
export const asyncActionHandlers: AsyncActionHandlers<AppReducer, AsyncAction> = {
  CREATENODEFROMBINDADDRESS:
    ({ dispatch }: reducerType) =>
    async (action: AsyncAction) => {
      const provider = await UltralightProvider.create(
        new ethers.providers.CloudflareProvider(),
        1,
        {
          supportedProtocols: [ProtocolId.HistoryNetwork],
          proxyAddress: action.payload.state.proxy,
          db: action.payload.state.LDB as any,
          transport: TransportLayer.WEB,
          //@ts-ignore
          config: {
            config: {
              enrUpdate: true,
              addrVotesToUpdateEnr: 1,
            },
          },
        }
      )
      await startUp(provider)
      dispatch({ type: StateChange.SETPORTAL, payload: provider })
    },
  CREATENODE:
    ({ dispatch }: reducerType) =>
    async (action: AsyncAction) => {
      try {
        const portal = await createNodeFromStorage(action.payload.state)
        dispatch({ type: StateChange.SETPORTAL, payload: portal })
      } catch (err: any) {
        const portal = await createNodeFromScratch(action.payload.state)
        dispatch({ type: StateChange.SETPORTAL, payload: portal })
      }
    },
  GETRECEIPTS:
    ({ dispatch }: reducerType) =>
    async (action: AsyncAction) => {
      const receipts =
        await action.payload.state.provider?.historyProtocol.receiptManager.getReceipts(
          Buffer.from(action.payload.state.block!.hash.slice(2), 'hex')
        )
      dispatch({ type: StateChange.SETRECEIPTS, payload: receipts })
    },
}

export type AppContextType = {
  state: AppState
  dispatch: React.Dispatch<AppStateAction | AsyncAction>
}

export const AppContext = React.createContext<AppContextType | undefined>(undefined)
