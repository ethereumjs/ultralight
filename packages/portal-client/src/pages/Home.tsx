import logo from '/logo.svg'
import Button from '@/components/ui/Button'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { getConfigValue } from '@/utils/helpers'
import { ConfigId } from '@/utils/types'

const Home = () => {
  const { client, initialize, cleanup } = usePortalNetwork()
  const udpPort = getConfigValue(ConfigId.UdpPort)
  return (
    <div className="w-full flex flex-col items-center">
      <img src={logo} alt="Description" className="max-w-full h-auto logo" />
      <h1 className="font-extrabold m-4 text-5xl">Ultralight Client</h1>
      <p className="font-extrabold m-2">Ultralight Decentralized Light Client</p>
      <Button
        onClick={client ? () => cleanup() : () => initialize(Number(udpPort))}
        children={`${client ? 'Shutdown' : 'Launch'} Ultralight`}
      />
    </div>
  )
}

export default Home
