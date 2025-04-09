import { FC, useState } from 'react'
import { useJsonRpc } from '@/hooks/useJsonRpc'
import { MethodInput } from '@/components/ui/MethodInput'
import { ResponseViewer } from '@/components/ui/ResponseViewer'
import Select from '@/components/ui/Select'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { useNotification } from '@/contexts/NotificationContext'
import { methodRegistry, MethodType } from '@/utils/rpcMethods'
import { APPROVED_METHODS } from '@/utils/constants/methodRegistry'

const BlockExplorer: FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<MethodType | ''>('')
  const [inputValue, setInputValue] = useState('')
  
  const { result, setResult, sendRequestHandle } = useJsonRpc()
  const { isLoading, setIsLoading } = usePortalNetwork()
  const { notify } = useNotification()

  const methodOptions = APPROVED_METHODS.map((method) => ({
    value: method,
    label: methodRegistry[method].name,
  }))

  const handleSubmit = async () => {
    if (selectedMethod && methodRegistry[selectedMethod]) {
      try {
        await methodRegistry[selectedMethod].handler(inputValue, sendRequestHandle)
      } catch (err) {
        notify({
          message: err instanceof Error ? err.message : 'Request failed',
          type: 'error',
        })
      }
    }
  }

  const handleSelectMethod = (method: MethodType) => {
    setSelectedMethod(method)
    setInputValue('')
    setResult(null)
    setIsLoading(false)
  }

 return (
   <div className="w-full max-w-2xl mx-auto mt-4 p-4 bg-[#1C232A]">
     <div className="bg-[#2A323C] rounded-lg shadow-lg p-6">
       <h2 className="text-2xl font-bold mb-6 text-gray-200">JSON RPC Interface</h2>
       <div className="mb-6">
         <Select
           options={methodOptions}
           value={selectedMethod}
           onChange={(e) => handleSelectMethod(e.target.value as MethodType)}
           placeholder="Select a method"
         />
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
       {result && <ResponseViewer data={result.result} />}
     </div>
   </div>
 )

}

export default BlockExplorer
