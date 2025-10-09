'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

interface SearchableSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
  className?: string
  disabled?: boolean
  id?: string // Add unique identifier
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search options...',
  options,
  className,
  disabled,
  id,
}: SearchableSelectProps) {
  const [searchValue, setSearchValue] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)

  // Filter and sort options based on search value
  const filteredOptions = React.useMemo(() => {
    let filtered = options

    if (searchValue) {
      filtered = options.filter(
        (option) =>
          option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
          option.value.toLowerCase().includes(searchValue.toLowerCase()),
      )
    }

    // Always sort alphabetically by label
    return filtered.sort((a, b) => a.label.localeCompare(b.label))
  }, [options, searchValue])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
  }

  const handleValueChange = (newValue: string) => {
    console.log(
      `SearchableSelect ${id || 'unknown'} value changed to:`,
      newValue,
    )
    // Clear search when value is selected
    setSearchValue('')
    setIsOpen(false)
    onValueChange?.(newValue)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Clear search when closing
      setSearchValue('')
    }
  }

  return (
    <Select
      value={value}
      onValueChange={handleValueChange}
      disabled={disabled}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        searchable
        searchPlaceholder={searchPlaceholder}
        onSearchChange={handleSearchChange}
      >
        {filteredOptions.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No options found.
          </div>
        ) : (
          filteredOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
