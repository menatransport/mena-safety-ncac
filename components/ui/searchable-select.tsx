"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, CirclePlus, Search, CircleMinus } from "lucide-react";

interface Option {
  value: string | number;
  label: string | null | undefined;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  onAdd?: () => void;
  onRemove?: (itemValue: string | number) => void;
  onAddFilter?: (itemValue: string | number) => void;
  onRemoveFilter?: (itemValue: string | number) => void;
  placeholder?: string;
  showAddRemove?: boolean;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value,
  onChange,
  onAdd,
  onRemove,
  onAddFilter,
  onRemoveFilter,
  placeholder = "เลือกรายการ...",
  showAddRemove = false,
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) => {
    // ตรวจสอบว่า option และ option.label มีค่า และไม่เป็น null/undefined
    if (!option || !option.label) return false;
    
    // แปลงเป็น string และทำ toLowerCase อย่างปลอดภัย
    const label = String(option.label).toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return label.includes(search);
  });

  // Get selected values as array for highlighting
  const getSelectedValues = () => {
    if (onAddFilter && value) {
      return value.toString().split(',').map(v => v.trim()).filter(Boolean);
    }
    return [];
  };

  // Update selected label when value changes
  useEffect(() => {
    if (onAddFilter && value) {
      // For multiple selection with onAddFilter, show actual values separated by comma
      const values = value.toString().split(',').map(v => v.trim()).filter(Boolean);
      if (values.length > 0) {
        // Show the actual selected values, not just count
        const labels = values.map(val => {
          const selectedOption = options.find((option) => option && option.value.toString() === val);
          return selectedOption && selectedOption.label ? String(selectedOption.label) : val;
        });
        setSelectedLabel(labels.join(', '));
      } else {
        setSelectedLabel("");
      }
    } else {
      // Single selection
      const selectedOption = options.find((option) => option && option.value === value);
      setSelectedLabel(selectedOption && selectedOption.label ? String(selectedOption.label) : "");
    }
  }, [value, options, onAddFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: Option) => {
    onChange(option.value);
    setSelectedLabel(option.label ? String(option.label) : "");
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm("");
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`flex items-center justify-between w-full text-sm p-2 border border-gray-300 rounded focus-within:ring-2 focus-within:ring-[#cfe5d0] focus-within:outline-none text-black bg-white cursor-pointer ${
          disabled ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
        onClick={handleToggle}
      >
        <span className={`flex-1 ${!selectedLabel ? "text-gray-400" : ""}`}>
          {selectedLabel || placeholder}
        </span>
        
        <div className="flex items-center space-x-1">
          {/* Add/Remove buttons */}
          {showAddRemove && (
            <> 
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
            </>
          )}
          
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-hidden" style={{ zIndex: 9999 }}>
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหา..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#cfe5d0]"
                autoFocus
              />
               {onAdd && (
                <CirclePlus
                  className="absolute right-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-green-700 hover:scale-110 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd();
                  }}
                />
              )}
            </div>
          </div>

          {/* Options */}
          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-sm">ไม่พบข้อมูล</div>
            ) : (
              filteredOptions.map((option) => {
                const selectedValues = getSelectedValues();
                const isSelected = selectedValues.includes(option.value.toString());
                
                return (
                  <div
                    key={option.value}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                      isSelected 
                        ? "bg-green-100 text-green-800 border-l-4 border-green-500" 
                        : value === option.value 
                          ? "bg-[#cfe5d0] text-gray-900" 
                          : "text-gray-700"
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    <div className="flex flex-row justify-between items-center">
                      <span className={isSelected ? "font-medium" : ""}>
                        {option.label ? String(option.label) : ""}
                        {isSelected && (
                          <span className="ml-2 text-xs bg-green-200 px-1 rounded">เลือกแล้ว</span>
                        )}
                      </span>
                      
                      <div className="flex gap-1">
                        {onRemove && (
                          <CircleMinus
                            className="w-4 h-4 text-gray-400 hover:text-red-500 hover:scale-110 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(option.value);
                            }}
                          />
                        )}

                        {onAddFilter && !isSelected && (
                          <CirclePlus
                            className="w-4 h-4 text-gray-400 hover:text-green-700 hover:scale-110 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddFilter(option.value);
                            }}
                          />
                        )}

                        {onRemoveFilter && isSelected && (
                          <CircleMinus
                            className="w-4 h-4 text-green-600 hover:text-red-500 hover:scale-110 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFilter(option.value);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};