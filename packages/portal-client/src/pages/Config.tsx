import ConfigCard from '@/components/config/ConfigCard'
import { CONFIG_DEFAULTS } from '@/utils/constants/config'

const ConfigPage = () => {
  

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Configuration Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONFIG_DEFAULTS.map((config) => (
          <ConfigCard
            key={config.id}
            title={config.title}
            defaultValue={config.defaultValue}
            description={config.description}
            storageKey={config.id}
          />
        ))}
      </div>
    </div>
  )
}

export default ConfigPage
