import debug, { Debugger } from 'debug'
import P2PT, { Peer } from 'p2pt'
import { EventEmitter } from 'events'
import { ENR } from './index.js'

export interface IChatMessage {
  username: string
  message: string
}
export class RTCPeerManager extends EventEmitter {
  log: Debugger
  p2pt: P2PT
  indentifier: string
  username: string
  members: Record<string, string>
  memberIds: Record<string, string>
  newMessage: string
  messages: IChatMessage[]
  status: string
  joined: boolean
  peers: Record<string, Peer>
  usernames: Record<string, string>
  constructor(nodeId: string) {
    super()
    this.log = debug('Portal').extend('RTC_PEER_MANAGER')
    this.indentifier = '0x500b'
    this.p2pt = new P2PT(['wss://tracker.openwebtorrent.com'], this.indentifier)
    this.username = nodeId
    this.members = {}
    this.memberIds = {}
    this.newMessage = ''
    this.messages = []
    this.joined = false
    this.status = ''
    this.peers = {}
    this.usernames = {}
  }
  updatePeer(nodeId: string, enr: string) {
    this.usernames[nodeId] = enr
  }
  setRoom(indentifier: string) {
    this.indentifier = indentifier
  }
  setUsername(username: string) {
    this.username = username
  }
  setNewMessage(message: string) {
    this.newMessage = message
  }
  getUsername() {
    return this.username
  }
  getNewMessage() {
    return this.newMessage
  }
  async sendMessage(to: string = '') {
    if (this.newMessage.trim() === '') {
      return
    }
    const message = {
      username: this.username,
      message: this.newMessage,
    }
    this.newMessage = ''
    if (to.trim() !== '') {
      const username = this.usernames[to]
      const memberId = this.memberIds[username]
      await this.p2pt.send(this.peers[memberId], JSON.stringify(message))
    } else {
      for (const peer of Object.values(this.peers)) {
        await this.p2pt.send(peer, JSON.stringify(message))
      }
    }
    this.messages.push(message)
  }
  listen() {
    if (this.getUsername().trim() === '') {
      return
    }
    this.joined = true
    this.status = `${this.username} connected`
    this.usernames = {}

    this.p2pt.on('peerconnect', (peer) => {
      this.log(`Connected to ${peer.id}`)
      if (peer.id !== this.username) {
        this.peers[peer.id] = peer
        this.status = `New Connection with ${peer.id.slice(0, 10)}`
      }
    })
    this.p2pt.on('peerclose', (peer) => {
      delete this.peers[peer.id]
      delete this.members[peer.id]
    })
    this.p2pt.on('msg', (peer, msg) => {
      msg = JSON.parse(msg)
      this.members[peer.id] = msg.username
      this.memberIds[msg.username] = peer.id
      if (msg.username.startsWith('enr')) {
        this.usernames[ENR.decodeTxt(msg.username).nodeId] = msg.username
      }
      this.messages.push({
        username: msg.username,
        message: msg.message,
      })
      if (msg.message.includes('address')) {
        this.emit('packet', msg.username, msg.message)
      }
    })
    this.p2pt.start()
  }
}
