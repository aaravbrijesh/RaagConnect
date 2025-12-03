import React, { useState } from 'react';
import { Calendar, MapPin, ArrowUpDown, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export type DateFilter = 'all' | 'upcoming' | 'past' | 'this-week' | 'this-month';
export type SortOption = 'date-asc' | 'date-desc' | 'price-asc' | 'price-desc' | 'name-asc';

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Filter */}
      <Select value={dateFilter} onValueChange={(v) => onDateFilterChange(v as DateFilter)}>
        <SelectTrigger className="w-[140px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Dates</SelectItem>
          <SelectItem value="upcoming">Upcoming</SelectItem>
          <SelectItem value="past">Past Events</SelectItem>
          <SelectItem value="this-week">This Week</SelectItem>
          <SelectItem value="this-month">This Month</SelectItem>
        </SelectContent>
      </Select>

      {/* Location Filter */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <MapPin className="h-4 w-4" />
            {locationFilter || 'Location'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-3">
            <Label>Filter by city or region</Label>
            <Input
              placeholder="e.g., New York, California"
              value={locationFilter}
              onChange={(e) => onLocationFilterChange(e.target.value)}
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  onLocationFilterChange('');
                  setIsOpen(false);
                }}
              >
                Clear
              </Button>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => setIsOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort By */}
      <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="w-[160px]">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date-asc">Date (Earliest)</SelectItem>
          <SelectItem value="date-desc">Date (Latest)</SelectItem>
          <SelectItem value="price-asc">Price (Low to High)</SelectItem>
          <SelectItem value="price-desc">Price (High to Low)</SelectItem>
          <SelectItem value="name-asc">Name (A-Z)</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Clear ({activeFilterCount})
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
