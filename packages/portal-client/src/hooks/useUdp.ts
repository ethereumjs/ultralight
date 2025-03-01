import { useState, useEffect } from 'react';
import { bind, send, unbind } from '@kuyoonjo/tauri-plugin-udp';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

/**
 * Custom hook to manage UDP communication
 * @param localAddress The local address to bind to (e.g., '0.0.0.0:8080')
 * @returns An object containing:
 * - `sendMessage`: Function to send a UDP message
 * - `messages`: Array of received messages
 * - `isBound`: Whether the UDP socket is currently bound
 */
function useUdp(localAddress: string) {
  const [isBound, setIsBound] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [unlisten, setUnlisten] = useState<UnlistenFn | null>(null);

  // Bind the UDP socket and set up a listener for incoming messages
  useEffect(() => {
    const socketId = 'udp-socket'; // Unique ID for the socket

    async function setupUdp() {
      try {
        // Bind the UDP socket
        await bind(socketId, localAddress);
        setIsBound(true);
        console.log(`UDP socket bound to ${localAddress}`);

        // Listen for incoming messages
        const unlistenFn = await listen('plugin://udp', (event) => {
          console.log('Received UDP message:', event.payload);
          const payload = event.payload as { id: string; remoteAddress: string; remotePort: number; buffer: string };
          if (payload.id === socketId) {
            setMessages((prev) => [...prev, payload.buffer]);
          }
        });
        setUnlisten(() => unlistenFn);
      } catch (error) {
        console.error('Failed to bind UDP socket:', error);
      }
    }

    setupUdp();

    // Cleanup function to unbind the socket and stop listening
    return () => {
      if (unlisten) {
        unlisten();
      }
      unbind(socketId).catch((error) => {
        console.error('Failed to unbind UDP socket:', error);
      });
      setIsBound(false);
    };
  }, [localAddress]);

  /**
   * Send a UDP message to a remote address
   * @param remoteAddress The remote address to send to (e.g., '192.168.1.2:9090')
   * @param message The message to send
   */
  async function sendMessage(remoteAddress: string, message: string) {
    if (!isBound) {
      console.error('UDP socket is not bound');
      return;
    }

    try {
      await send('udp-socket', remoteAddress, message);
      console.log(`Message sent to ${remoteAddress}: ${message}`);
    } catch (error) {
      console.error('Failed to send UDP message:', error);
    }
  }

  return { sendMessage, messages, isBound };
}

export default useUdp;