import { InputValue } from '@/utils/types'

interface MethodInputProps {
  value: InputValue
  onChange: (value: string) => void
  className?: string
  placeholder: string
  onSubmit: () => void
  onCancel: () => void
  isLoading: boolean
  showIncludeFullTx?: boolean
  includeFullTx?: boolean
  onIncludeFullTxChange?: (value: boolean) => void
  showBlockHeight?: boolean
  blockHeight?: string
  onBlockHeightChange?: (value: string) => void
}

export const MethodInput: React.FC<MethodInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  onSubmit,
  onCancel,
  isLoading,
  showIncludeFullTx = false,
  includeFullTx = false,
  onIncludeFullTxChange,
  showBlockHeight = false,
  blockHeight = 'latest',
  onBlockHeightChange,
}) => {
  const defaultClasses =
    'flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

  const handleBlockHeightChange = (value: string) => {
    if (onBlockHeightChange) {
      const normalizedValue = value.trim()
      onBlockHeightChange(normalizedValue)
    }
  }

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
            onChange={(e) => handleBlockHeightChange(e.target.value)}
            placeholder="Block number"
            className="w-full bg-[#2A323C] text-gray-200 border border-gray-600 placeholder-gray-400 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          />
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
