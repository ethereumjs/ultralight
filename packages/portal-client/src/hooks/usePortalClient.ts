import { createPortalClient } from "@/services/portalNetwork/client";
import { useEffect, useState } from "react";

export function usePortalClient() {
  const [client, setClient] = useState<any | null>(null);
  const [status, setStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeClient() {
      try {
        const newClient = await createPortalClient();
        
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