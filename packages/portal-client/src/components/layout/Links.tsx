import { Link } from 'react-router-dom'
const Links = () => {
  return (
    <ul
      tabIndex={0}
      className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow 
                 lg:flex lg:w-auto lg:menu-horizontal lg:px-1 lg:space-x-2 lg:mt-0 lg:bg-transparent lg:shadow-none"
    >
      <li>
        <Link to="/">Home</Link>
      </li>
      <li>
        <Link to="/jsonrpc">JsonRPC</Link>
      </li>
      <li>
        <Link to="/config">Config</Link>
      </li>
    </ul>
  )
}

export default Links
