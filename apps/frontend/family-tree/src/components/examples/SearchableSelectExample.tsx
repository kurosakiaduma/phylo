'use client'

import { useState } from 'react'
import { SearchableSelect } from '@/components/ui/select'

// Example usage of the SearchableSelect component
export function SearchableSelectExample() {
  const [selectedValue, setSelectedValue] = useState<string>('')

  // Example options - could be family members, countries, etc.
  const options = [
    { value: 'john-doe', label: 'John Doe' },
    { value: 'jane-smith', label: 'Jane Smith' },
    { value: 'bob-johnson', label: 'Bob Johnson' },
    { value: 'alice-williams', label: 'Alice Williams' },
    { value: 'charlie-brown', label: 'Charlie Brown' },
    { value: 'diana-davis', label: 'Diana Davis' },
    { value: 'edward-miller', label: 'Edward Miller' },
    { value: 'fiona-wilson', label: 'Fiona Wilson' },
    { value: 'george-moore', label: 'George Moore' },
    { value: 'helen-taylor', label: 'Helen Taylor' },
  ]

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-semibold">Searchable Select Example</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium">Select a family member:</label>
        <SearchableSelect
          value={selectedValue}
          onValueChange={setSelectedValue}
          placeholder="Choose a family member..."
          searchPlaceholder="Search family members..."
          options={options}
          className="w-full"
        />
      </div>

      {selectedValue && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
          <p className="text-sm">
            Selected:{' '}
            <strong>
              {options.find((opt) => opt.value === selectedValue)?.label}
            </strong>
          </p>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Type to search through options</p>
        <p>• Use arrow keys to navigate</p>
        <p>• Press Enter to select</p>
      </div>
    </div>
  )
}
