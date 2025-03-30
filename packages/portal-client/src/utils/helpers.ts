import { ConfigId } from '@/utils/types'
import { CONFIG_DEFAULTS } from '@/utils/constants/config'

/**
 * Get a configuration value from localStorage or fall back to the default value from CONFIG_DEFAULTS.
 * @param id - The configuration ID (e.g., ConfigId.UdpPort).
 * @returns The value from localStorage or the default value.
 */
export const getConfigValue = (id: ConfigId): string => {
  const config = CONFIG_DEFAULTS.find((config) => config.id === id)
  const localStorageKey = id.toLowerCase().replace(/_/g, '-')
  //@ts-ignore
  return localStorage.getItem(localStorageKey) || config.defaultValue
}

// utils/jsonRenderer.ts
// import type { ReactNode } from 'react';

export const renderJsonValue = (value: unknown): ReactNode => {
  if (value === null) return <span className="text-gray-400 italic">null</span>;
  if (value === undefined) return <span className="text-gray-400 italic">undefined</span>;
  
  if (typeof value === 'boolean') {
    return <span className="text-yellow-400">{String(value)}</span>;
  }
  
  if (typeof value === 'number') {
    return <span className="text-green-400">{value}</span>;
  }
  
  if (typeof value === 'string') {
    return <span className="text-teal-300">"{value}"</span>;
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">[ ]</span>;
    
    return (
      <div className="pl-4 border-l border-gray-600 mt-1">
        <div className="text-gray-400">[</div>
        {value.map((item, index) => (
          <div key={index} className="ml-4 flex items-start">
            <span className="text-gray-500 mr-2">{index}:</span>
            {renderJsonValue(item)}
          </div>
        ))}
        <div className="text-gray-400">]</div>
      </div>
    );
  }
  
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-gray-400">{ }</span>;
    
    return (
      <div className="pl-4 border-l border-gray-600 mt-1">
        <div className="text-gray-400">{'{'}</div>
        {entries.map(([key, val]) => (
          <div key={key} className="ml-4 flex items-start">
            <span className="text-purple-400 mr-2">{key}:</span>
            {renderJsonValue(val)}
          </div>
        ))}
        <div className="text-gray-400">{'}'}</div>
      </div>
    );
  }
  
  return <span>{String(value)}</span>;
};