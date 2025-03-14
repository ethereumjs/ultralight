// import PowerOnIcon from '@/components/icons/PowerOnIcon'
// import PowerOffIcon from '@/components/icons/PowerOffIcon'
import { useEffect, useState } from 'react'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { ConfigId } from '@/utils/types'
import { CONFIG_DEFAULTS } from '@/utils/constants/config'

const InitializeAppBtn = () => {
//@ts-ignore
  const { initialize, client, cleanup } = usePortalNetwork()
  const [udpPort, setUdpPort] = useState<number | undefined>()
  const [wsa, setWsa] = useState<string | undefined>()

  const udpPortConfig = CONFIG_DEFAULTS.find((config) => config.id === ConfigId.UdpPort)
  const udpPortDefault = udpPortConfig?.defaultValue

  const websocketAddress = CONFIG_DEFAULTS.find((config) => config.id === ConfigId.WebsocketAddress)
  const websocketAddressDefault = websocketAddress?.defaultValue

  const handleClick = () => {
    const port = udpPort ?? Number(udpPortDefault)
    const address = wsa ?? websocketAddressDefault

    if (port === undefined || address === undefined) {
      console.error('UDP port or websocket address is undefined');
      return;
    }

    initialize(port, address);
  }

  useEffect(() => {
    const savedValue = localStorage.getItem('udp-port')
    savedValue ? setUdpPort(Number(savedValue)) : setUdpPort(Number(udpPortDefault))  
  }, [udpPortDefault])

  useEffect(() => {
    const savedValue = localStorage.getItem('websocket-address')
    savedValue ? setWsa(savedValue) : setWsa(websocketAddressDefault)
  }, [websocketAddressDefault])

  return (
    <div onClick={client ? handleClick : handleClick} className="cursor-pointer">
      {/* <input type="checkbox" className="toggle-primary" /> */}
      {client ? 'Off' : 'On'}
      {/* <PowerOffIcon />
      <PowerOnIcon /> */}
    </div>
  )
}

export default InitializeAppBtn