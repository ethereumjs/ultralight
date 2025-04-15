import { FC, useMemo, useState } from 'react'
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
  const [includeFullTx, setIncludeFullTx] = useState(false)
  const [blockHeight, setBlockHeight] = useState('earliest')

  const { result, setResult, sendRequestHandle } = useJsonRpc()
  const { isLoading, setIsLoading, cancelRequest } = usePortalNetwork()
  const { notify } = useNotification()

  const methodOptions = APPROVED_METHODS.map((method) => ({
    value: method,
    label: methodRegistry[method].name,
  }))

  const handleSubmit = async () => {
    if (selectedMethod && methodRegistry[selectedMethod]) {
      try {
        let formattedInput = inputValue

        if (methodParamMap[selectedMethod]?.showIncludeFullTx) {
          formattedInput = `${inputValue},${includeFullTx}`
        } else if (methodParamMap[selectedMethod]?.showBlockHeight) {
          if (
            !['latest', 'pending', 'earliest'].includes(blockHeight) &&
            Number.isNaN(Number(blockHeight))
          ) {
            throw new Error(
              'Invalid block height - must be "latest", "pending", "earliest", or a number',
            )
          }
          formattedInput = `${inputValue},${blockHeight}`
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
    setInputValue('')
    setResult(null)
    setIsLoading(false)
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

  const methodParamMap = useMemo(() => {
    const map: Record<string, { showIncludeFullTx?: boolean; showBlockHeight?: boolean }> = {}

    APPROVED_METHODS.forEach((method) => {
      if (method.includes('BlockBy')) {
        map[method] = { showIncludeFullTx: true }
      } else if (method === 'eth_getTransactionCount' || method === 'eth_getBalance') {
        map[method] = { showBlockHeight: true }
      } else {
        map[method] = {}
      }
    })

    return map
  }, [])

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
              isLoading={isLoading}
              className="bg-[#2A323C] text-gray-200 border border-gray-600 placeholder-gray-400 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
              showIncludeFullTx={currentMethodConfig.showIncludeFullTx}
              includeFullTx={includeFullTx}
              onIncludeFullTxChange={setIncludeFullTx}
              showBlockHeight={currentMethodConfig.showBlockHeight}
              blockHeight={blockHeight}
              onBlockHeightChange={setBlockHeight}
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
