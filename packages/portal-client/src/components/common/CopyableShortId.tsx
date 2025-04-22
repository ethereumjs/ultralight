import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { shortId } from 'portalnetwork'

interface CopyableShortIdProps {
  value: string
  displayPrefix?: string
  className?: string
}

export const CopyableShortId = ({
  value,
  displayPrefix = '',
  className = '',
}: CopyableShortIdProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={`flex items-center ${className}`}>
      <span className="font-mono">{displayPrefix}{shortId(value)}</span>
      <button
        onClick={handleCopy}
        className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
        title={copied ? "Copied!" : "Copy to clipboard"}
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check size={16} className="text-green-500" />
        ) : (
          <Copy size={16} className="text-gray-500 hover:text-gray-700" />
        )}
      </button>
    </div>
  )
}