import { FC } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { PortalNetworkProvider } from '@/contexts/PortalNetworkContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import JsonRpc from '@/pages/JsonRpc'
import Home from '@/pages/Home'
import Config from '@/pages/Config'
import Nodes from '@/pages/Nodes'
import PageNotFound from '@/pages/PageNotFound'
import Header from '@/components/layout/Header'

const App: FC = () => {
  return (
    <PortalNetworkProvider>
      <NotificationProvider>
        <Router>
          <div className="grid grid-rows-[auto_1fr] h-screen">
            <Header />
            <main className="overflow-auto">
              <div className="flex justify-center items-center h-full">
                <div className="w-full max-w-4xl mx-auto px-4 text-center">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/jsonrpc" element={<JsonRpc />} />
                    <Route path="/nodes" element={<Nodes />} />
                    <Route path="/config" element={<Config />} />
                    <Route path="*" element={<PageNotFound />} />
                  </Routes>
                </div>
              </div>
            </main>
          </div>
        </Router>
      </NotificationProvider>
    </PortalNetworkProvider>
  )
}

export default App
