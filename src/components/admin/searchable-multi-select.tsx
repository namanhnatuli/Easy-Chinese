"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { X, Search, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { inputClassName } from "@/components/admin/form-primitives";

interface Option {
  value: string;
  label: string;
}

interface SearchableMultiSelectProps {
  name: string;
  options: string[] | Option[];
  defaultValue?: string | string[];
  placeholder?: string;
  labelMapping?: Record<string, string>;
  isMulti?: boolean;
}

export function SearchableMultiSelect({
  name,
  options,
  defaultValue = [],
  placeholder = "Search...",
  labelMapping = {},
  isMulti = true,
}: SearchableMultiSelectProps) {
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: labelMapping[opt] || opt };
      }
      return opt;
    });
  }, [options, labelMapping]);

  const initialValues = useMemo(() => {
    if (!defaultValue) return [];
    if (Array.isArray(defaultValue)) return defaultValue;
    return defaultValue.split("|").map((v) => v.trim()).filter(Boolean);
  }, [defaultValue]);

  const [selected, setSelected] = useState<string[]>(initialValues);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [normalizedOptions, query]);

  const labelByValue = useMemo(
    () => new Map(normalizedOptions.map((option) => [option.value, option.label])),
    [normalizedOptions],
  );

  const toggleOption = (value: string) => {
    if (isMulti) {
      setSelected((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      setSelected([value]);
      setIsOpen(false);
    }
    setQuery("");
  };

  const removeOption = (value: string) => {
    setSelected((prev) => prev.filter((v) => v !== value));
  };

  return (
    <div className="relative space-y-2" ref={containerRef}>
      {/* Hidden input for form submission */}
      <input type="hidden" hidden name={name} value={selected.join(" | ")} />

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Search className="size-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(inputClassName(), "pl-10")}
        />

        {isOpen && filteredOptions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 duration-100">
            {filteredOptions.map((opt) => {
              const isActive = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleOption(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium truncate">{opt.label}</span>
                    {opt.label !== opt.value && (
                      <span className="text-[10px] text-muted-foreground truncate">{opt.value}</span>
                    )}
                  </div>
                  {isActive && <Check className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex min-h-11 flex-wrap content-start gap-2">
        {selected.map((val) => (
          <Badge
            key={val}
            variant="secondary"
            className="flex items-center gap-1 border-primary/20 bg-primary/10 py-0.5 pl-2 pr-1 text-primary"
          >
            {labelByValue.get(val) || labelMapping[val] || val}
            <button
              type="button"
              onClick={() => removeOption(val)}
              className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
