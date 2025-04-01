// import PowerOnIcon from '@/components/icons/PowerOnIcon'
// import PowerOffIcon from '@/components/icons/PowerOffIcon'
import { useEffect, useState } from 'react'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { ConfigId } from '@/utils/types'
import { CONFIG_DEFAULTS } from '@/utils/constants/config'

const InitializeAppBtn = () => {
  const { initialize, client, cleanup } = usePortalNetwork()
  const [udpPort, setUdpPort] = useState<number | undefined>()

  const udpPortConfig = CONFIG_DEFAULTS.find((config) => config.id === ConfigId.UdpPort)
  const udpPortDefault = udpPortConfig?.defaultValue

  const handleClick = () => {
    const port = udpPort ?? Number(udpPortDefault)

    if (port === undefined) {
      console.error('UDP port is undefined');
      return;
    }

    initialize(port);
  }

  useEffect(() => {
    const savedValue = localStorage.getItem('udp-port')
    savedValue ? setUdpPort(Number(savedValue)) : setUdpPort(Number(udpPortDefault))  
  }, [udpPortDefault])

  return (
    <div onClick={client ? cleanup : handleClick} className="cursor-pointer">
      {/* <input type="checkbox" className="toggle-primary" /> */}
      {client ? 'Off' : 'On'}
      {/* <PowerOffIcon />
      <PowerOnIcon /> */}
    </div>
  )
}

export default InitializeAppBtn