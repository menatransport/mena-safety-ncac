"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, CirclePlus, Search, CircleMinus, X } from "lucide-react";

interface Option {
  value: string | number;
  label: string | null | undefined;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  onClick?: (value: string | number) => void;
  onOpen?: () => void;
  onAdd?: () => void;
  onRemove?: (itemValue: string | number) => void;
  onAddFilter?: (itemValue: string | number) => void;
  onRemoveFilter?: (itemValue: string | number) => void;
  placeholder?: string;
  showAddRemove?: boolean;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value,
  onChange,
  onClick,
  onOpen,
  onAdd,
  onRemove,
  onAddFilter,
  onRemoveFilter,
  placeholder = "",
  showAddRemove = false,
  className = "",
  disabled = false,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 250; // Approximate max height

      // Decide whether to show above or below
      const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownPosition({
        top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      updateDropdownPosition();

      // Update position on scroll and resize
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);

      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen]);

  const filteredOptions = options.filter((option) => {
    if (!option || !option.label) return false;

    const label = String(option.label).toLowerCase();
    const search = searchTerm.toLowerCase();

    return label.includes(search);
  });

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
      const selectedOption = options.find((option) => option && option.value === value);
      setSelectedLabel(selectedOption && selectedOption.label ? String(selectedOption.label) : "");
    }
  }, [value, options, onAddFilter]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (option: Option) => {
    onChange(option.value);
    setSelectedLabel(option.label ? String(option.label) : "");
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleToggle = () => {
    if (!disabled) {
      const willOpen = !isOpen;
      setIsOpen(willOpen);
      if (willOpen) {
        setSearchTerm("");
        onOpen?.();
      }
    }
  };

  const renderDropdown = () => {
    if (!isOpen || disabled || !mounted) return null;

    const dropdown = (
      <div
        ref={dropdownRef}
        className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          zIndex: 99999,
        }}
      >

        <div className="p-2 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหา..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-[#cfe5d0]"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            {onAdd && (
              <CirclePlus
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 hover:text-emerald-600 hover:scale-110 cursor-pointer transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
              />
            )}
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-slate-400 text-sm text-center">ไม่พบข้อมูล</div>
          ) : (
            filteredOptions.map((option) => {
              const selectedValues = getSelectedValues();
              const isSelected = selectedValues.includes(option.value.toString());

              return (
                <div
                  key={option.value}
                  className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${isSelected
                      ? "bg-emerald-50 text-emerald-700 border-l-3 border-emerald-500"
                      : value === option.value
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  onClick={() => handleSelect(option)}
                >
                  <div className="flex flex-row justify-between items-center">
                    <span className={isSelected ? "font-medium" : ""}>
                      {option.label ? String(option.label) : ""}
                      {isSelected && (
                        <span className="ml-2 text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">✓</span>
                      )}
                    </span>

                    <div className="flex gap-1">
                      {onRemove && (
                        <CircleMinus
                          className="w-4 h-4 text-slate-400 hover:text-red-500 hover:scale-110 cursor-pointer transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(option.value);
                          }}
                        />
                      )}

                      {onAddFilter && !isSelected && (
                        <CirclePlus
                          className="w-4 h-4 text-slate-400 hover:text-emerald-600 hover:scale-110 cursor-pointer transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddFilter(option.value);
                          }}
                        />
                      )}

                      {onRemoveFilter && isSelected && (
                        <CircleMinus
                          className="w-4 h-4 text-emerald-600 hover:text-red-500 hover:scale-110 cursor-pointer transition-all"
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
    );

    return createPortal(dropdown, document.body);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={triggerRef}
        className={`flex items-center justify-between w-full text-sm p-2 border rounded bg-white cursor-pointer transition-all text-black ${error
            ? "border-red-400 ring-2 ring-red-200"
            : isOpen
              ? "border-gray-300 ring-2 ring-[#cfe5d0] outline-none"
              : "border-gray-300 hover:border-[#cfe5d0]"
          } ${disabled ? "!bg-gray-100 !cursor-not-allowed !text-blue-600 !font-bold" : ""
          }`}
        onClick={handleToggle}
      >
        <span className={`flex-1 truncate ${!selectedLabel ? "text-gray-400" : disabled ? "!text-blue-600 !font-bold" : ""}`}>
          {selectedLabel || placeholder}
        </span>

        <div className="flex items-center gap-1 ml-2">
          {selectedLabel && !disabled && (
            <X
              className="w-4 h-4 text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSelectedLabel("");
              }}
            />
          )}

          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
              }`}
          />
        </div>
      </div>

      {renderDropdown()}
    </div>
  );
};

const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
};