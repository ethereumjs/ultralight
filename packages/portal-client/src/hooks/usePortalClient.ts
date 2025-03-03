import { createPortalClient } from "@/services/portalNetwork/client";
import { useEffect, useState } from "react";
import { event } from '@tauri-apps/api'

export function usePortalClient() {
  const [client, setClient] = useState<any | null>(null);
  const [status, setStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
let newClient: ReturnType<typeof createPortalClient> | null = null;
    async function initializeClient() {
      try {
        // const newClient = await createPortalClient();
        event.once('tauri://created', () => {
  // Initialize your application here
  createPortalClient().then(client => {

    console.log('Portal client created successfully', client);
  }).catch(error => {
    console.error('Failed to create portal client:', error);
  });
});
        
        if (mounted) {
          setClient(newClient);
          setStatus('ready');
        }
      } catch (err) {
        console.error('Failed to initialize Portal Network client:', err);
        
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus('error');
        }
      }
    }

    initializeClient();

    // Cleanup function to stop the client when the component unmounts
    return () => {
      mounted = false;
      
      if (client) {
        client.stop().catch(console.error);
      }
    };
  }, []);

  return { client, status, error };
}