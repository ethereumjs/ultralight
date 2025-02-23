
import { Link } from 'react-router-dom'
import Links from './Links'
import MenuBtn from '@/components/ui/MenuBtn'
import ThemeToggle from '@/components/ui/ThemeToggle'
import InitializeAppBtn from '@/components/common/InitializeAppBtn'

const Header = () => {

  return (
    <header className="navbar bg-base-100 px-12">
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost text-xl">
          Ultralight
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <Links />
      </div>
      <div className="navbar-end">
        <InitializeAppBtn />
        <ThemeToggle />
        <MenuBtn />
      </div>
    </header>
  )
}

export default Header
