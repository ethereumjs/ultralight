// import PowerOnIcon from '@/components/icons/PowerOnIcon'
// import PowerOffIcon from '@/components/icons/PowerOffIcon'
import { useEffect, useState } from 'react'
import { usePortalNetwork } from '@/contexts/PortalNetworkContext'
import { ConfigId } from '@/utils/types'
import { CONFIG_DEFAULTS } from '@/utils/constants/config'
import { useNotification } from '@/contexts/NotificationContext'

const InitializeAppBtn = () => {
  const { initialize, client, cleanup } = usePortalNetwork()
  const [udpPort, setUdpPort] = useState<number | undefined>()
  const { notify } = useNotification()

  const udpPortConfig = CONFIG_DEFAULTS.find((config) => config.id === ConfigId.UdpPort)
  const udpPortDefault = udpPortConfig?.defaultValue

  const handleClick = async () => {
    const port = udpPort ?? Number(udpPortDefault)

    if (port === undefined) {
      return notify({ message: 'UDP port is undefined' })
    }

    try {
      await initialize(port)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize'
      notify({ message })
    }
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