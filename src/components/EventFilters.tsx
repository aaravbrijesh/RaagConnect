import React, { useState, useRef, useEffect } from 'react';
import { Calendar, MapPin, ArrowUpDown, X, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

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

    // Cancel previous request
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
        console.error('Location search error:', error);
        setSuggestions([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value);
    
    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchLocations(value);
    }, 300);
  };

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    // Extract city/region name for filtering
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
    <div className="flex flex-col gap-4 p-4 bg-card/50 rounded-lg border border-border/50">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Filters Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-fit">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(v) => onDateFilterChange(v as DateFilter)}>
              <SelectTrigger className="w-[150px] bg-background">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-50">
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past Events</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Location Filter with Autocomplete */}
            <Popover open={isLocationOpen} onOpenChange={setIsLocationOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 min-w-[150px] justify-start bg-background">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="truncate max-w-[120px]">
                    {locationFilter || 'Any Location'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-popover border border-border shadow-lg z-50" align="start">
                <div className="p-3 space-y-3">
                  <Label className="text-sm font-medium">Filter by location</Label>
                  <div className="relative">
                    <Input
                      placeholder="Type city, state, or region..."
                      value={locationInput}
                      onChange={(e) => handleLocationInputChange(e.target.value)}
                      className="pr-8"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Suggestions List */}
                  {suggestions.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border rounded-md bg-background">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors border-b border-border/50 last:border-0"
                          onClick={() => handleSelectLocation(suggestion)}
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{suggestion.display_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {locationInput.length >= 2 && !isSearching && suggestions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No locations found
                    </p>
                  )}
                  
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleClearLocation}
                    >
                      Clear
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        onLocationFilterChange(locationInput);
                        setIsLocationOpen(false);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Separator for desktop */}
        <Separator orientation="vertical" className="hidden lg:block h-8" />
        
        {/* Sort Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-fit">
            <ArrowUpDown className="h-4 w-4" />
            <span>Sort:</span>
          </div>
          
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger className="w-[170px] bg-background">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-lg z-50">
              <SelectItem value="date-asc">Date (Earliest)</SelectItem>
              <SelectItem value="date-desc">Date (Latest)</SelectItem>
              <SelectItem value="price-asc">Price (Low → High)</SelectItem>
              <SelectItem value="price-desc">Price (High → Low)</SelectItem>
              <SelectItem value="name-asc">Name (A → Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <>
            <Separator orientation="vertical" className="hidden lg:block h-8" />
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1 text-destructive hover:text-destructive">
              <X className="h-4 w-4" />
              Clear All ({activeFilterCount})
            </Button>
          </>
        )}
      </div>
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

  // Apply date filter
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

  // Apply location filter (case-insensitive partial match)
  if (locationFilter) {
    const lowerFilter = locationFilter.toLowerCase();
    filtered = filtered.filter(event => 
      event.location_name?.toLowerCase().includes(lowerFilter)
    );
  }

  // Apply sorting
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
