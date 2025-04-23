import { usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { InputValue, MethodParamConfig } from '@/utils/types'

interface MethodInputProps extends MethodParamConfig{
  value: InputValue
  onChange: (value: string) => void
  className?: string
  placeholder: string
  onSubmit: () => void
  onCancel: () => void
  includeFullTx?: boolean
  onIncludeFullTxChange?: (value: boolean) => void
  blockHeight?: string
  onBlockHeightChange?: (value: string) => void
  contentKey?: string
  onContentKeyChange?: (value: string) => void
  distances?: string
  onDistancesChange?: (value: string) => void
}

export const MethodInput: React.FC<MethodInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  onSubmit,
  onCancel,
  showDistances = false,
  showBlockHeight = false,
  showIncludeFullTx = false,
  showEnr = false,
  includeFullTx = false,
  onIncludeFullTxChange,
  onBlockHeightChange,
  onContentKeyChange,
  onDistancesChange,
  blockHeight = '',
  contentKey = '',
  distances = '',
}) => {
  const { isLoading } = usePortalNetwork()
  const defaultClasses =
    'flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="flex flex-col space-y-4">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${defaultClasses} ${className}`}
      />

      {showIncludeFullTx && (
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={includeFullTx}
              onChange={() => onIncludeFullTxChange?.(!includeFullTx)}
            />
            <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-300">
              Include Full Transactions
            </span>
          </label>
        </div>
      )}

      {showBlockHeight && (
        <div>
          <input
            type="text"
            value={blockHeight}
            onChange={(e) => onBlockHeightChange?.(e.target.value)}
            placeholder="Block number"
            className="w-full bg-[#2A323C] text-gray-200 border border-gray-600 placeholder-gray-400 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {showEnr && (
        <div>
          <input
            type="text"
            value={contentKey}
            onChange={(e) => onContentKeyChange?.(e.target.value)}
            placeholder="Content key"
            className="w-full bg-[#2A323C] text-gray-200 border border-gray-600 placeholder-gray-400 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {showDistances && (
        <div>
          <input
            type="text"
            value={distances}
            onChange={(e) => onDistancesChange?.(e.target.value)}
            placeholder="Comma-separated distances (e.g., 252,253,254)"
            className="w-full bg-[#2A323C] text-gray-200 border border-gray-600 placeholder-gray-400 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="text-xs text-gray-400 mt-1">
            Enter log2 distances (0-256) separated by commas
          </div>
        </div>
      )}

      <div className="flex space-x-2">
        <button
          onClick={onCancel}
          disabled={!isLoading}
            className="flex-1 px-4 py-2 bg-red-300 text-white rounded-lg hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
        >
          Submit
        </button>        
      </div>
    </div>
  )
}
