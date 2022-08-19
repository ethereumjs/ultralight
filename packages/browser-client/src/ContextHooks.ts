import { Block } from '@ethereumjs/block'
import { ENR, HistoryProtocol, PortalNetwork } from 'portalnetwork'
import { createContext, Dispatch, SetStateAction } from 'react'

export const PortalContext = createContext(PortalNetwork.prototype)
export const BlockContext = createContext({
  block: Block.prototype,
  setBlock: (() => {}) as Dispatch<SetStateAction<Block>>,
})
export const HistoryProtocolContext = createContext(HistoryProtocol.prototype)
export const PeersContext = createContext([ENR.prototype])
