import logo from '/logo.svg'
import Button from '@/components/ui/Button'
// import PortalNetwork from '@/components/PortalNetwork'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'

const Home = () => {
  const { client, initialize, cleanup } = usePortalNetwork()
  return (
    <div className="w-full flex flex-col items-center">
      {/* <PortalNetwork /> */}
      <img src={logo} alt="Description" className="max-w-full h-auto logo" />
      <h1 className="font-extrabold m-4 text-5xl">Ultrallight Client</h1>
      <p className="font-extrabold m-2">Ultrallight Decentralized Light Client</p>
      <Button
        onClick={client ? () => cleanup() : () => initialize()}
        children={`${client ? 'Shutdown' : 'Launch'} Ultralight`}
      />
    </div>
  )
}

export default Home
