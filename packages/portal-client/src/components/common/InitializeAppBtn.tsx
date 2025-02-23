import PowerOnIcon from '@/components/icons/PowerOnIcon'
import PowerOffIcon from '@/components/icons/PowerOffIcon'
import useInitializeApp from '@/hooks/useInitializeApp'

const InitializeAppBtn = () => {
 const { handleInitialize } = useInitializeApp()

  return (
    <label onClick={handleInitialize} className="toggle text-base-content">
      <input type="checkbox" className="toggle-primary" />
      <PowerOffIcon />
      <PowerOnIcon />
    </label>
  )
}

export default InitializeAppBtn