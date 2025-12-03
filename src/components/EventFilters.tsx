import React, { useState, useRef, useEffect } from 'react';
import { Calendar, MapPin, ArrowUpDown, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

export type DateFilter = 'all' | 'upcoming' | 'past' | 'this-week' | 'this-month';
export type SortOption = 'date-asc' | 'date-desc' | 'price-asc' | 'price-desc' | 'name-asc';

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface EventFiltersProps {
  dateFilter: DateFilter;
  onDateFilterChange: (value: DateFilter) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export default function EventFilters({
  dateFilter,
  onDateFilterChange,
  sortBy,
  onSortChange,
  locationFilter,
  onLocationFilterChange,
  onClearFilters,
  activeFilterCount
}: EventFiltersProps) {
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationInput, setLocationInput] = useState(locationFilter);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocationInput(locationFilter);
  }, [locationFilter]);

  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setIsSearching(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode?q=${encodeURIComponent(query)}&limit=5`,
        {
          signal: abortRef.current.signal,
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        }
      );

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setSuggestions(data || []);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setSuggestions([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchLocations(value);
    }, 300);
  };

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    const parts = suggestion.display_name.split(',');
    const shortName = parts.slice(0, 2).join(',').trim();
    setLocationInput(shortName);
    onLocationFilterChange(shortName);
    setSuggestions([]);
    setIsLocationOpen(false);
  };

  const handleClearLocation = () => {
    setLocationInput('');
    onLocationFilterChange('');
    setSuggestions([]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filters Label */}
      <span className="text-sm text-muted-foreground mr-1">Filter:</span>
      
      {/* Date Filter */}
      <Select value={dateFilter} onValueChange={(v) => onDateFilterChange(v as DateFilter)}>
        <SelectTrigger className="h-9 w-auto min-w-[130px] text-sm">
          <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border shadow-md">
          <SelectItem value="all">All Dates</SelectItem>
          <SelectItem value="upcoming">Upcoming</SelectItem>
          <SelectItem value="past">Past</SelectItem>
          <SelectItem value="this-week">This Week</SelectItem>
          <SelectItem value="this-month">This Month</SelectItem>
        </SelectContent>
      </Select>

      {/* Location Filter */}
      <Popover open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm font-normal">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            {locationFilter || 'Location'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 bg-popover border shadow-md" align="start">
          <div className="space-y-3">
            <Label className="text-sm">Search location</Label>
            <div className="relative">
              <Input
                placeholder="City, state, or region..."
                value={locationInput}
                onChange={(e) => handleLocationInputChange(e.target.value)}
                className="h-9 text-sm pr-8"
              />
              {isSearching && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            
            {suggestions.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    onClick={() => handleSelectLocation(suggestion)}
                  >
                    <span className="line-clamp-1">{suggestion.display_name}</span>
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1 h-8" onClick={handleClearLocation}>
                Clear
              </Button>
              <Button size="sm" className="flex-1 h-8" onClick={() => {
                onLocationFilterChange(locationInput);
                setIsLocationOpen(false);
              }}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Divider */}
      <div className="h-5 w-px bg-border mx-1" />

      {/* Sort Label */}
      <span className="text-sm text-muted-foreground mr-1">Sort:</span>
      
      {/* Sort By */}
      <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="h-9 w-auto min-w-[140px] text-sm">
          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border shadow-md">
          <SelectItem value="date-asc">Date (Earliest)</SelectItem>
          <SelectItem value="date-desc">Date (Latest)</SelectItem>
          <SelectItem value="price-asc">Price (Low → High)</SelectItem>
          <SelectItem value="price-desc">Price (High → Low)</SelectItem>
          <SelectItem value="name-asc">Name (A → Z)</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9 gap-1 text-sm text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}

// Helper function to filter and sort events
export function filterAndSortEvents(
  events: any[],
  dateFilter: DateFilter,
  locationFilter: string,
  sortBy: SortOption
): any[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  let filtered = [...events];

  if (dateFilter !== 'all') {
    filtered = filtered.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      
      switch (dateFilter) {
        case 'upcoming':
          return eventDate >= now;
        case 'past':
          return eventDate < now;
        case 'this-week': {
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return eventDate >= now && eventDate <= weekEnd;
        }
        case 'this-month': {
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return eventDate >= now && eventDate <= monthEnd;
        }
        default:
          return true;
      }
    });
  }

  if (locationFilter) {
    const lowerFilter = locationFilter.toLowerCase();
    filtered = filtered.filter(event => 
      event.location_name?.toLowerCase().includes(lowerFilter)
    );
  }

  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date-asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'date-desc':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'price-asc':
        return (a.price || 0) - (b.price || 0);
      case 'price-desc':
        return (b.price || 0) - (a.price || 0);
      case 'name-asc':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  return filtered;
}
