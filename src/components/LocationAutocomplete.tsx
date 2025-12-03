import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Check } from 'lucide-react';
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
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setInputValue(value);
    setIsSelected(!!value);
  }, [value]);

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

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setIsSearching(true);

    try {
      // Use Nominatim with addressdetails for better address matching including house numbers
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&countrycodes=us`,
        { 
          signal: abortRef.current.signal,
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      const results: LocationSuggestion[] = data.map((item: any) => ({
        place_id: item.place_id,
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon
      }));
      
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Location search error:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsSelected(false);
    onChange(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.display_name);
    setIsSelected(true);
    setShowSuggestions(false);
    setSuggestions([]);
    onChange({
      name: suggestion.display_name,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    });
  };

  // Allow user to use their exact typed input (with geocoding)
  const handleUseTypedAddress = async () => {
    if (!inputValue.trim()) return;
    
    setIsSearching(true);
    try {
      // Do a final geocode lookup for the exact typed address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&limit=1&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        setIsSelected(true);
        setShowSuggestions(false);
        onChange({
          name: inputValue, // Keep user's typed address
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        });
      } else {
        // If no geocode result, still allow but with approximate coords from first suggestion
        if (suggestions.length > 0) {
          setIsSelected(true);
          setShowSuggestions(false);
          onChange({
            name: inputValue,
            lat: parseFloat(suggestions[0].lat),
            lng: parseFloat(suggestions[0].lon)
          });
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <MapPin className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
            isSelected ? "text-green-500" : "text-muted-foreground"
          )} />
        )}
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputValue && inputValue.length >= 2) {
              searchLocations(inputValue);
            }
          }}
          placeholder={placeholder}
          className={cn(
            "pl-10 transition-colors",
            isSelected && "border-green-500 focus-visible:ring-green-500"
          )}
        />
      </div>

      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto">
          {suggestions.length > 0 && (
            <>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={`${suggestion.place_id}-${idx}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-start gap-3 border-b border-border last:border-0"
                >
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span className="text-sm line-clamp-2">{suggestion.display_name}</span>
                </button>
              ))}
              
              {/* Option to use exact typed address */}
              {inputValue && !isSelected && (
                <button
                  type="button"
                  onClick={handleUseTypedAddress}
                  className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 bg-muted/50 border-t border-border"
                >
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">
                    Use "<span className="font-medium">{inputValue}</span>"
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {isSelected && (
        <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
          <span>✓</span> Location verified
        </p>
      )}
    </div>
  );
}
