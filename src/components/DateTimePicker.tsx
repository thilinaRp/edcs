import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface DateTimePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  required,
  className
}) => {
  const handleSetNow = () => {
    const d = new Date();
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    onChange(formatted);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {label} {required && <span className="text-brand-500">*</span>}
          </label>
          <button
            type="button"
            onClick={handleSetNow}
            className="text-[10px] uppercase font-black tracking-widest text-brand-500 hover:text-brand-600 transition-colors"
          >
            Set to Now
          </button>
        </div>
      )}
      
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none flex gap-1">
          <Calendar size={16} />
          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
          <Clock size={16} />
        </div>
        
        <input 
          type="datetime-local"
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full pl-16 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800",
            "rounded-none outline-none transition-all",
            "focus:border-brand-500 focus:ring-0",
            "font-mono text-sm",
            !value && "text-slate-400"
          )}
        />
        
        {/* Swiss structural accent */}
        <div className="absolute right-0 bottom-0 w-2 h-2 bg-brand-500 opacity-0 group-focus-within:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};
