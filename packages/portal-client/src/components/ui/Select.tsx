import { ComponentProps } from 'react'

type Option = {
  value: string
  label: string
}

interface SelectProps extends ComponentProps<'select'> {
  options: Option[]
  placeholder?: string
}

const Select = ({
  options,
  placeholder = 'Select an option',
  className = '',
  ...props
}: SelectProps) => {
  return (
    <select
      className={`select select-bordered w-full bg-[#2A323C] text-gray-200 border-gray-600 focus:outline-none focus:border-blue-500 ${className}`}
      {...props}
    >
      <option value="" disabled className="bg-[#2A323C]">
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-[#2A323C] hover:bg-[#3A434C]">
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default Select
