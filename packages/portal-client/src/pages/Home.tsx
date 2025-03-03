import useInitializeApp from '@/hooks/useInitializeApp'
import logo from '/logo.svg'
import Button from '@/components/ui/Button'
import PortalApp from '@/components/PortalNetwork'
// import UdpComponent from '@/components/Udp'

const Home = () => {
  const { isInitialized, handleInitialize } = useInitializeApp()
  return (
    <div className="w-full flex flex-col items-center">
      {/* <UdpComponent /> */}
      <PortalApp />
      <img src={logo} alt="Description" className="max-w-full h-auto logo" />
      <h1 className="font-extrabold m-4 text-5xl">Ultrallight Client</h1>
      <p className="font-extrabold m-2">Ultrallight Decentralized Light Client</p>
      <Button
        onClick={handleInitialize}
        children={`${isInitialized ? 'Shutdown' : 'Launch'} Ultralight`}
      />
    </div>
  )
}

export default Home
