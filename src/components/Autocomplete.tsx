import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Option {
  id: string;
  name: string;
  subtext?: string;
}

interface AutocompleteProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  label,
  required,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(query.toLowerCase()) ||
    (opt.subtext && opt.subtext.toLowerCase().includes(query.toLowerCase()))
  );

  const handleSelect = (option: Option) => {
    onChange(option.id);
    setIsOpen(false);
    setQuery('');
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div className={cn("relative space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-all focus-within:ring-2 focus-within:ring-brand-500",
          isOpen && "ring-2 ring-brand-500 border-brand-500"
        )}
      >
        <Search size={16} className="text-slate-400 shrink-0" />
        
        <div className="flex-1 min-w-0">
          {selectedOption ? (
            <span className="block truncate text-slate-900 dark:text-slate-100">
              {selectedOption.name}
            </span>
          ) : (
            <span className="block truncate text-slate-400">
              {placeholder}
            </span>
          )}
        </div>

        {value && (
          <button 
            onClick={clearSelection}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
          >
            <X size={14} />
          </button>
        )}
        
        <ChevronDown 
          size={16} 
          className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} 
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <input
              autoFocus
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-0 outline-none"
              placeholder="Type to filter..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option);
                  }}
                  className={cn(
                    "flex flex-col px-3 py-2 rounded-lg cursor-pointer transition-colors",
                    value === option.id 
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  )}
                >
                  <span className="font-medium text-sm">{option.name}</span>
                  {option.subtext && (
                    <span className="text-xs opacity-60">{option.subtext}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-slate-500 italic">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
