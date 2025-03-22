import { FC, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { PortalNetworkProvider } from '@/contexts/PortalNetworkContext'
import JsonRpc from '@/pages/JsonRpc'
import Home from '@/pages/Home'
import Config from '@/pages/Config'
import PageNotFound from '@/pages/PageNotFound'
import Header from '@/components/layout/Header'
import ErrorBoundary from './components/ErrorBoundary'

const setupErrorHandling = () => {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // You can add analytics tracking here
  });

  // Catch global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // You can add analytics tracking here
  });
};

const App: FC = () => {
  useEffect(() => {
    setupErrorHandling();
    
    // Test WebCrypto to make sure it's properly initialized
    try {
      const crypto = window.crypto || (window as any).msCrypto;
      if (crypto) {
        console.log('Native WebCrypto is available');
      } else {
        console.log('Native WebCrypto is NOT available, should be using polyfill');
      }
    } catch (error) {
      console.error('Error checking WebCrypto availability:', error);
    }
  }, []);
  return (
    <ErrorBoundary>
      <PortalNetworkProvider>
        <Router>
          <div className="grid grid-rows-[auto_1fr] h-screen">
            <Header />
            <main className="overflow-auto">
              <div className="flex justify-center items-center h-full">
                <div className="w-full max-w-4xl mx-auto px-4 text-center">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/jsonrpc" element={<JsonRpc />} />
                    <Route path="/config" element={<Config />} />
                    <Route path="*" element={<PageNotFound />} />
                  </Routes>
                </div>
              </div>
            </main>
          </div>
        </Router>
      </PortalNetworkProvider>
    </ErrorBoundary>
  )
}

export default App
