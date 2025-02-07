import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  [key: string]: any
}

const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  onClick,
  disabled = false,
  type = 'button',
  ...props
}) => {

  const defaultClasses =
    'btn w-70 px-4 py-2 m-2 bg-gradient-to-r from-[#5313BC] to-[#AE61FE] font-bold font-medium rounded hover:bg-blue-700 focus:outline-none transition-colors'

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      className={`${defaultClasses} ${disabledClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
