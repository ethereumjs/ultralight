import { FC, useState } from 'react'
import { useNodes } from '@/hooks/useNodes'
import { MethodInput } from '@/components/ui/MethodInput'
import { ResponseViewer } from '@/components/ui/ResponseViewer'
import { methodRegistry, APPROVED_METHODS, MethodType } from '@/utils/constants/methodRegistry'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'

const BlockExplorer: FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<MethodType | ''>('')
  const [inputValue, setInputValue] = useState('')
  const { node, isLoading, error, sendRequestHandle } = useNodes()
  const { isLoading: isPortalNetworkLoading, isNetworkReady, error: portalNetworkError } = usePortalNetwork()

  const handleSubmit = async () => {
    if (selectedMethod && methodRegistry[selectedMethod]) {
      methodRegistry[selectedMethod].handler(inputValue, sendRequestHandle)
    }
  }

 return (
   <div className="w-full max-w-2xl mx-auto mt-4 p-4 bg-[#1C232A]">
     <div className="bg-[#2A323C] rounded-lg shadow-lg p-6">
       <h2 className="text-2xl font-bold mb-6 text-gray-200">JSON RPC Interface</h2>
       {isLoading && <p>Loading client...</p>}
       {!isPortalNetworkLoading && !isNetworkReady && <p>Client loaded, waiting for network...</p>}
       {isNetworkReady && <p>Network is ready!</p>}
       {portalNetworkError && <p>Error: {portalNetworkError.message}</p>}
       <div className="mb-6">
         <label className="block text-sm font-medium text-gray-300 mb-2">Select Method</label>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
           {APPROVED_METHODS.map((method) => (
             <button
               key={method}
               onClick={() => setSelectedMethod(method)}
               className={`p-2 text-sm rounded-lg border transition-all duration-200 ${
                 selectedMethod === method
                   ? 'bg-blue-600 text-white border-blue-500'
                   : 'bg-[#2A323C] text-gray-300 border-gray-600 hover:bg-gray-700'
               }`}
             >
               {methodRegistry[method].name}
             </button>
           ))}
         </div>
       </div>

       {selectedMethod && (
         <div className="mb-6">
           <MethodInput
             value={inputValue}
             onChange={setInputValue}
             placeholder={methodRegistry[selectedMethod].paramPlaceholder}
             onSubmit={handleSubmit}
             isLoading={isLoading}
             className="bg-[#2A323C] text-gray-200 border border-gray-600 placeholder-gray-400 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
           />
         </div>
       )}

       {isLoading && <div className="text-center text-gray-400">Loading...</div>}

       {error && (
         <div className="p-4 bg-red-900/30 text-red-400 border border-red-500 rounded-lg mb-4">
           Error: {error.message}
         </div>
       )}
       {node && <ResponseViewer data={node.result} />}
     </div>
   </div>
 )

}

export default BlockExplorer
