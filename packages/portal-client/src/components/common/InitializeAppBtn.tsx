// import PowerOnIcon from '@/components/icons/PowerOnIcon'
// import PowerOffIcon from '@/components/icons/PowerOffIcon'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'

const InitializeAppBtn = () => {
//  const { isInitialized, handleInitialize } = useInitializeApp()
//@ts-ignore
 const { initialize, client, cleanup } = usePortalNetwork()

  return (
    <div onClick={client ? () => initialize() : () => initialize()} className="cursor-pointer">
      {/* <input type="checkbox" className="toggle-primary" /> */}
      {client ? 'Off' : 'On'}
      {/* <PowerOffIcon />
      <PowerOnIcon /> */}
    </div>
  )
}

export default InitializeAppBtn