import { useState } from 'react'
import useUdp from '../hooks/useUdp'

function UdpComponent() {
  const [remoteAddress, setRemoteAddress] = useState('127.0.0.1:9091')
  const [message, setMessage] = useState('hello')
  const { sendMessage, messages, isBound } = useUdp('0.0.0.0:8081')

  return (
    <div>
      <h1>UDP Communication</h1>
      <div>
        <label>
          Remote Address:
          <input
            type="text"
            value={remoteAddress}
            onChange={(e) => setRemoteAddress(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Message:
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
      </div>
      <button onClick={() => sendMessage(remoteAddress, message)} disabled={!isBound}>
        Send Message
      </button>
      <div>
        <h2>Received Messages</h2>
        <ul>
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default UdpComponent
