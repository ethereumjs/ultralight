import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { PortalNetworkProvider, usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import JsonRpc from '@/pages/JsonRpc'
import Home from '@/pages/Home'
import Config from '@/pages/Config'
import Peers from '@/pages/Peers'
import PageNotFound from '@/pages/PageNotFound'
import Header from '@/components/layout/Header'

const AppContent = () => {
  const { isLoading } = usePortalNetwork()
  
  return (
    <div className="grid grid-rows-[auto_1fr] h-screen">
      <Header />    
      <main className="overflow-auto">
        <div className="flex justify-center items-center h-full">
          <div className="w-full max-w-4xl mx-auto px-4 text-center">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/jsonrpc" element={<JsonRpc />} />
              <Route path="/config" element={<Config />} />
              <Route path="/peers" element={<Peers />} />
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </div>
        </div>
      </main>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  )
}

const App = () => {
  return (
    <PortalNetworkProvider>
      <NotificationProvider>
        <Router>
          <AppContent />
        </Router>
      </NotificationProvider>
    </PortalNetworkProvider>
  )
}

export default App
