import ConfigCard from "@/components/config/ConfigCard"

const ConfigPage = () => {

  const configDefaults = [
    {
      id: 'udp-port',
      title: 'UDP Port',
      defaultValue: '8545',
      description: 'The default port for UDP connections',
    },
    {
      id: 'node-bind-port',
      title: 'Node Bind Port',
      defaultValue: '9090',
      description: 'The port to bind the node server',
    },
    {
      id: 'http-server-port',
      title: 'HTTP Server Port',
      defaultValue: '8080',
      description: 'The port for the HTTP server',
    },
    {
      id: 'api-timeout',
      title: 'API Timeout',
      defaultValue: '30000',
      description: 'Timeout for API requests in milliseconds',
    },
  ]

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Configuration Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configDefaults.map((config) => (
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
