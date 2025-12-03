import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

type LocationSuggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type LocationAutocompleteProps = {
  value: string;
  onChange: (location: {
    name: string;
    lat: number;
    lng: number;
  } | null) => void;
  placeholder?: string;
  className?: string;
};

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Search for a location...",
  className
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSelected, setIsSelected] = useState(!!value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Update input when external value changes
  useEffect(() => {
    setInputValue(value);
    setIsSelected(!!value);
  }, [value]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      const data = await response.json();
      setSuggestions(data || []);
      setShowSuggestions(data && data.length > 0);
    } catch (error) {
      console.error('Location search failed:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsSelected(false);
    onChange(null);

    // Debounce the search - 200ms for responsiveness
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 200);
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    const shortName = formatLocationName(suggestion.display_name);
    setInputValue(shortName);
    setIsSelected(true);
    setShowSuggestions(false);
    setSuggestions([]);
    onChange({
      name: shortName,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    });
  };

  const formatLocationName = (displayName: string): string => {
    const parts = displayName.split(', ');
    if (parts.length <= 3) return displayName;
    return parts.slice(0, 4).join(', ');
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
          isSelected ? "text-green-500" : "text-muted-foreground"
        )} />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={cn(
            "pl-10 transition-colors",
            isSelected && "border-green-500 focus-visible:ring-green-500"
          )}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-start gap-3 border-b border-border last:border-0"
            >
              <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span className="text-sm line-clamp-2">{suggestion.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      {isSelected && (
        <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
          <span>✓</span> Location verified
        </p>
      )}
    </div>
  );
}
