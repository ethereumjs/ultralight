import PowerOnIcon from '@/components/icons/PowerOnIcon'
import PowerOffIcon from '@/components/icons/PowerOffIcon'
import useInitializeApp from '@/hooks/useInitializeApp'

const InitializeAppBtn = () => {
 const { isInitialized, handleInitialize } = useInitializeApp()

  return (
    <div onClick={handleInitialize} className="cursor-pointer">
      {/* <input type="checkbox" className="toggle-primary" /> */}
      {isInitialized ? 'On' : 'Off'}
      {/* <PowerOffIcon />
      <PowerOnIcon /> */}
    </div>
  )
}

export default InitializeAppBtn