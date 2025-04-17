import { useState } from 'react'
import jsonRenderer from '@/components/common/jsonRenderer'

interface ResponseViewerProps {
  data: any
  responseType?: 'block' | 'bigNumber' | 'code' | 'storage' | 'callResult' | 'ether'
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'pretty' | 'raw'>('pretty')

  if (!data) return null

  const renderContent = () => {
    if (activeTab === 'raw') {
      return (
        <pre className="bg-[#1C232A] text-left p-4 rounded-lg overflow-auto font-mono text-sm">
          {JSON.stringify(data, null, 2)}
        </pre>
      )
    }
console.log('datarendertype ', data.responseType)
    switch (data.responseType) {
      
      case 'block':
        return (
          <div className="space-y-1 font-mono text-sm overflow-auto max-h-[70vh]">
            {Object.entries(data.result).map(([key, value]) => (
              <div key={key} className="ml-4 flex items-start">
                <span className="text-purple-400 mr-2">{key}:</span>
                {jsonRenderer(value)}
              </div>
            ))}
          </div>
        )
      
      case 'bigNumber':
        return (
          <div className="font-mono text-xl text-green-400 p-4 text-center">
            {data.result}
          </div>
        )
      
      case 'ether':
        return (
          <div className="font-mono text-xl p-4 text-center">
            <span className="text-green-400">{data.result}</span>
            <span className="text-gray-400 ml-2">ETH</span>
          </div>
        )
      
      case 'code':
        return (
          <div className="font-mono text-sm p-2 bg-[#1C232A] rounded overflow-auto max-h-[70vh]">
            <pre className="text-green-300 break-all whitespace-pre-wrap">
              {data || '0x'}
            </pre>
          </div>
        )
      
      case 'storage':
        return (
          <div className="font-mono text-sm p-4">
            <div className="flex items-center">
              <span className="text-purple-400 mr-2">Storage Value:</span>
              <span className="text-green-300 break-all">{data.result || '0x0'}</span>
            </div>
          </div>
        )
      
      case 'callResult':
        return (
          <div className="font-mono text-sm p-4">
            <div className="flex items-start">
              <span className="text-purple-400 mr-2">Result:</span>
              <pre className="text-green-300 break-all whitespace-pre-wrap">
                {data.result || '0x'}
              </pre>
            </div>
          </div>
        )
      
      default:
        if (typeof data.result === 'object' && data.result !== null) {
          return (
            <div className="space-y-1 font-mono text-sm overflow-auto max-h-[70vh]">
              {Object.entries(data.result).map(([key, value]) => (
                <div key={key} className="ml-4 flex items-start">
                  <span className="text-purple-400 mr-2">{key}:</span>
                  {jsonRenderer(value)}
                </div>
              ))}
            </div>
          )
        } else {
          return (
            <div className="font-mono text-lg p-4 text-center text-green-400">
              {String(data.result)}
            </div>
          )
        }
    }
  }

  return (
    <div className="mt-4">
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveTab('pretty')}
          className={`px-4 py-1 rounded-lg ${
            activeTab === 'pretty'
              ? 'bg-blue-600 text-white'
              : 'bg-[#2A323C] text-gray-300 border border-gray-600 hover:bg-gray-700'
          }`}
        >
          Pretty View
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'raw'
              ? 'bg-blue-600 text-white'
              : 'bg-[#2A323C] text-gray-300 border border-gray-600 hover:bg-gray-700'
          }`}
        >
          Raw JSON
        </button>
      </div>

      <div className="bg-[#2A323C] rounded-lg shadow p-4">
        {renderContent()}
      </div>
    </div>
  )
}
