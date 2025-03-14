import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Links from './Links'
import ThemeToggle from '@/components/ui/ThemeToggle'
import InitializeAppBtn from '@/components/common/InitializeAppBtn'

const Header = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setDrawerOpen(false)
  }, [location])

  return (
    <div className="drawer">
      <input
        id="my-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={drawerOpen}
        onChange={() => setDrawerOpen(!drawerOpen)}
      />

      <div className="drawer-content">
        {/* Page content here */}
        <header className="navbar bg-base-100 px-4 md:px-12 sticky top-0 z-30 shadow-sm">
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
            <label htmlFor="my-drawer" className="btn btn-ghost lg:hidden drawer-button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h8m-8 6h16"
                />
              </svg>
            </label>
          </div>
        </header>
      </div>

      <div className="drawer-side z-40">
        <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <div className="menu p-4 w-64 min-h-full bg-base-200 text-base-content">
          <button
            className="btn btn-sm btn-circle absolute right-2 top-2"
            onClick={() => setDrawerOpen(false)}
          >
            ✕
          </button>
          <div className="mt-10">
            <Links />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
