import React from 'react'
// import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'

function CityDropDown({ value, onChange, placeholder, options  }) {

  const gujcities = [
    { value: 'Ahmedabad', label: 'Ahmedabad' },
    { value: 'Surat', label: 'Surat' },
    { value: 'Vadodara', label: 'Vadodara' },
    { value: 'Rajkot', label: 'Rajkot' },
    { value: 'Bhavnagar', label: 'Bhavnagar' },
    { value: 'Jamnanagar', label: 'Jamnanagar' },
    { value: 'Gandhinagar', label: 'Gandhinagar' },
    { value: 'Nadiad', label: 'Nadiad' },
    { value: 'Navsari', label: 'Navsari' },
    { value: 'Anand', label: 'Anand' },
  ]

  const allOptions = options ?? gujcities

  const selectStyles = {
    control: (base) => ({
      ...base,
      background: 'var(--input-bg)',
      color: 'var(--text-base)',
      borderColor: 'var(--input-border)',
    }),
    menu: (base) => ({
      ...base,
      background: 'var(--input-bg)',
      color: 'var(--text-base)',
    }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused
        ? 'var(--table-striped)'
        : 'var(--input-bg)',
      color: state.isSelected
        ? 'var(--text-base)'
        : 'var(--text-base)',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--text-base)',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--text-base)',
    }),
  }

  return (
    <CreatableSelect
      options={allOptions}
      isClearable
      isSearchable
      placeholder={placeholder}
      value={value ? { value, label: value } : null}
      onChange={(opt) => onChange(opt ? opt.value : '')}
      styles={selectStyles}
      formatCreateLabel = {(input) => `${input}` }
    />
  )
}

export default CityDropDown