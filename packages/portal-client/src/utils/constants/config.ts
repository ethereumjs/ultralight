import { ConfigId } from '../types'

export const CONFIG_DEFAULTS: {
  id: ConfigId
  title: string
  defaultValue: string
  description: string
}[] = [
  {
    id: ConfigId.UdpPort,
    title: 'UDP Port',
    defaultValue: '9000',
    description: 'The default port for UDP connections',
  },
  {
    id: ConfigId.NodeBindPort,
    title: 'Node Bind Port',
    defaultValue: '9090',
    description: 'The port to bind the node server',
  },
]
