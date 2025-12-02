import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
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
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Location search failed:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsSelected(false);
    onChange(null); // Clear selection when typing

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
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
    // Shorten the display name to be more readable
    const parts = displayName.split(', ');
    if (parts.length <= 3) return displayName;
    // Return first 3-4 meaningful parts
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
            "pl-10 pr-10 transition-colors",
            isSelected && "border-green-500 focus-visible:ring-green-500"
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
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

      {/* No results message */}
      {showSuggestions && !isLoading && inputValue.length >= 3 && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
          No locations found. Try a different search.
        </div>
      )}

      {/* Helper text */}
      {isSelected && (
        <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
          <span>✓</span> Location verified
        </p>
      )}
      {!isSelected && inputValue && inputValue.length < 3 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Type at least 3 characters to search
        </p>
      )}
    </div>
  );
}
