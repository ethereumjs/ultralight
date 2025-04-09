import { useState, useEffect, FC } from 'react'
import { Edit, Save } from 'lucide-react'

interface ConfigCardProps {
  title: string
  defaultValue: string
  description: string
  storageKey: string
}

const ConfigCard: FC<ConfigCardProps> = ({
  title,
  defaultValue,
  description,
  storageKey,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const [displayValue, setDisplayValue] = useState(defaultValue)

  useEffect(() => {
    const savedValue = localStorage.getItem(storageKey)
    if (savedValue) {
      setValue(savedValue)
      setDisplayValue(savedValue)
    }
  }, [storageKey])

  const handleSave = () => {
    localStorage.setItem(storageKey, value)
    setDisplayValue(value)
    setIsEditing(false)
  }

  return (
    <div className="card bg-base-100 shadow-xl m-2 p-4 w-full max-w-md relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="card-title text-left font-bold text-lg">{title}</h2>
        {isEditing ? (
          <button onClick={handleSave} className="btn btn-sm btn-ghost" aria-label="Save">
            <Save size={18} />
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-sm btn-ghost"
            aria-label="Edit"
          >
            <Edit size={18} />
          </button>
        )}
      </div>

      <div className="card-body p-0">
        {isEditing ? (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input input-bordered w-full mb-2"
            autoFocus
          />
        ) : (
          <p className="text-left font-medium text-lg mb-1">{displayValue}</p>
        )}
        <p className="text-left text-gray-500 text-sm">{description}</p>
      </div>
    </div>
  )
}

export default ConfigCard
