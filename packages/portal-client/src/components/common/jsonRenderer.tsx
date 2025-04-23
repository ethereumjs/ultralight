import { ReactNode } from 'react'

const jsonRenderer = (value: any): ReactNode => {
  if (value === null) return <span className="text-gray-400 italic">null</span>
  if (value === undefined) return <span className="text-gray-400 italic">undefined</span>

  if (typeof value === 'boolean') {
    return <span className="text-yellow-400">{String(value)}</span>
  }

  if (typeof value === 'number') {
    return <span className="text-green-400">{value}</span>
  }

  if (typeof value === 'string') {
    return <span className="text-teal-300">"{value}"</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">[ ]</span>

    return (
      <div className="pl-4 border-l border-gray-600 mt-1">
        <div className="text-gray-400">[</div>
        {value.map((item, index) => (
          <div key={index} className="ml-4 flex items-start text-left">
            <span className="text-gray-500 mr-2">{index}:</span>
            {jsonRenderer(item)}
          </div>
        ))}
        <div className="text-gray-400">]</div>
      </div>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) return <span className="text-gray-400">{}</span>

    return (
      <div className="pl-4 border-l border-gray-600 mt-1">
        <div className="text-gray-400">{'{'}</div>
        {entries.map(([key, val]) => (
          <div key={key} className="ml-4 flex items-start text-left">
            <span className="text-purple-400 mr-2">{key}:</span>
            {jsonRenderer(val)}
          </div>
        ))}
        <div className="text-gray-400">{'}'}</div>
      </div>
    )
  }

  return <span>{String(value)}</span>
}

export  default jsonRenderer
