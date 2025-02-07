import React, { useState } from 'react'

interface ResponseViewerProps {
  data: any
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'pretty' | 'raw'>('pretty')

  if (!data) return null

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
        {activeTab === 'pretty' ? (
          <div className="space-y-1 overflow-auto">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="flex space-x-2  ">
                <span className="font-semibold">{key}:</span>
                <span className="font-mono">{JSON.stringify(value, null, 2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <pre className="bg-[#1C232A] text-left p-4 rounded-lg overflow-auto font-mono text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )

}
