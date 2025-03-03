interface MethodInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder: string
  onSubmit: () => void
  isLoading: boolean
}

export const MethodInput: React.FC<MethodInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  onSubmit,
  isLoading,
}) => {
  const defaultClasses =
    'flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
  return (
    <div className="flex space-x-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${defaultClasses} ${className}`}
      />
      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
      >
        Submit
      </button>
    </div>
  )
}
