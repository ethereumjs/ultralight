import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useJsonRpc } from '@/hooks/useJsonRpc'
import { MethodInput } from '@/components/ui/MethodInput'
import { ResponseViewer } from '@/components/ui/ResponseViewer'
import Select from '@/components/ui/Select'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { useNotification } from '@/contexts/NotificationContext'
import { methodRegistry, MethodType } from '@/utils/rpcMethods'
import { APPROVED_METHODS } from '@/utils/constants/methodRegistry'
import { MethodParamConfig } from '@/utils/types'

const BlockExplorer = () => {
  const [selectedMethod, setSelectedMethod] = useState<MethodType | ''>('')
  const [inputValue, setInputValue] = useState('')
  const [includeFullTx, setIncludeFullTx] = useState(false)
  const [blockHeight, setBlockHeight] = useState('')
  const [contentKey, setContentKey] = useState('')
  const [distances, setDistances] = useState('')

  const { result, setResult, sendRequestHandle } = useJsonRpc()
  const { setIsLoading, cancelRequest, client } = usePortalNetwork()
  const { notify } = useNotification()
  const location = useLocation()
  const isPeersRoute = location.pathname === '/peers'

  const filteredMethods = useMemo(() => {
    return isPeersRoute 
      ? APPROVED_METHODS.filter(method => method.startsWith('portal_'))
      : APPROVED_METHODS;
  }, [isPeersRoute])

  const methodOptions = useMemo(() => {
    return filteredMethods.map((method) => ({
      value: method,
      label: methodRegistry[method].name,
    }));
  }, [filteredMethods])

  const handleSubmit = async () => {
    if (selectedMethod && methodRegistry[selectedMethod]) {
      try {
        let formattedInput = inputValue

        if (methodParamMap[selectedMethod]?.showIncludeFullTx) {
          formattedInput = `${inputValue},${includeFullTx}`
        } else if (methodParamMap[selectedMethod]?.showBlockHeight) {        
          formattedInput = `${inputValue},${blockHeight}`
        } else if (methodParamMap[selectedMethod]?.showEnr) {     
          formattedInput = `${inputValue},${contentKey}`
        } else if (methodParamMap[selectedMethod]?.showDistances) {     
          const distanceArray = distances.split(',').map(d => Number(d.trim()))    
          formattedInput = `${inputValue},${distanceArray}`
        }
        await methodRegistry[selectedMethod].handler(formattedInput, sendRequestHandle)
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
    reset()
  }

  const handleCancel = () => {
    if (cancelRequest) {
      cancelRequest()
      setIsLoading(false)
      notify({
        message: 'Request cancelled',
        type: 'info',
      })
    }
  }

  const reset = () => {
    setInputValue('')
    setBlockHeight('')
    setContentKey('')
    setDistances('')
    setIncludeFullTx(false)
    setResult(null)
    setIsLoading(false)
  }

  const methodParamMap = useMemo(() => {
    const map = {} as Record<MethodType, MethodParamConfig>
    filteredMethods.forEach((method) => {
      const config: MethodParamConfig = {}
      
      if (method.includes('BlockBy')) {
        config.showIncludeFullTx = true
      }      
      if (method === 'eth_getTransactionCount' || method === 'eth_getBalance') {
        config.showBlockHeight = true
      }     
      if (method.includes('portal_historyFindContent')) {
        config.showEnr = true
      }
      if (method.includes('portal_historyFindNodes')) {
        config.showDistances = true
      }
      map[method] = config
    })
  
    return map
  }, [])

  useEffect(() => {
    if (client === null) {
      reset()
    }
  }, [client])

  const currentMethodConfig = selectedMethod ? methodParamMap[selectedMethod] || {} : {}

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
              onCancel={handleCancel}
              className="bg-[#2A323C] text-gray-200 border border-gray-600 placeholder-gray-400 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
              includeFullTx={includeFullTx}
              onIncludeFullTxChange={setIncludeFullTx}
              onBlockHeightChange={setBlockHeight}
              onDistancesChange={setDistances}
              onContentKeyChange={setContentKey}
              showIncludeFullTx={currentMethodConfig.showIncludeFullTx}
              showBlockHeight={currentMethodConfig.showBlockHeight}
              showDistances={currentMethodConfig.showDistances}
              showEnr={currentMethodConfig.showEnr}
              blockHeight={blockHeight}
              contentKey={contentKey}
              distances={distances}
            />
          </div>
        )}
        {result && <ResponseViewer data={result} />}
      </div>
    </div>
  )
}

export default BlockExplorer
