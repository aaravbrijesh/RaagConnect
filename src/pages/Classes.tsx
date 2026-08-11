import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { recordPath } from '@/lib/slug';
import { useNavigate } from 'react-router-dom';
import Nav from '@/components/Nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GraduationCap, MapPin, Users, Clock, Search, Plus, Globe, User as UserIcon,
  Phone, ChevronRight, SlidersHorizontal, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface ClassItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  genre: string;
  skill_level: string;
  class_type: string;
  location_name: string | null;
  price: number | null;
  max_capacity: number | null;
  contact_info: string | null;
  image_url: string | null;
  recurring_schedule: string | null;
  schedule_details: string | null;
  created_at: string;
  slug?: string | null;
  teacher_name?: string;
}

type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'newest' | 'name';

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const TYPES = [
  { value: 'in-person', label: 'In-Person' },
  { value: 'online', label: 'Online' },
  { value: 'both', label: 'Both' },
];

export default function Classes() {
  const { user } = useAuth();
  const { isArtist, isOrganizer, isAdmin, hasRole } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('relevance');
  const [showFilters, setShowFilters] = useState(false);

  const isTeacher = hasRole('teacher' as any);
  const canCreateClass = isArtist || isOrganizer || isTeacher || isAdmin;

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data?.map((c) => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

      setClasses(
        data?.map((c) => ({
          ...c,
          teacher_name: nameMap.get(c.user_id) || 'Unknown Teacher',
        })) || []
      );
    } catch (error: any) {
      toast.error('Failed to load classes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const genres = useMemo(() => [...new Set(classes.map((c) => c.genre))].sort(), [classes]);

  const countBy = (predicate: (c: ClassItem) => boolean) => classes.filter(predicate).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const loc = locationQuery.trim().toLowerCase();
    const list = classes.filter((c) => {
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.genre?.toLowerCase().includes(q) ||
        c.teacher_name?.toLowerCase().includes(q);
      const matchesLoc =
        !loc ||
        c.location_name?.toLowerCase().includes(loc) ||
        (c.class_type === 'online' && 'online'.includes(loc));
      const matchesGenre = genreFilter === 'all' || c.genre === genreFilter;
      const matchesLevel = levelFilter === 'all' || c.skill_level === levelFilter;
      const matchesType = typeFilter === 'all' || c.class_type === typeFilter;
      return matchesSearch && matchesLoc && matchesGenre && matchesLevel && matchesType;
    });

    const sorted = [...list];
    if (sortBy === 'price-asc') sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sortBy === 'price-desc') sorted.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    if (sortBy === 'name') sorted.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'newest')
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted;
  }, [classes, search, locationQuery, genreFilter, levelFilter, typeFilter, sortBy]);

  const activeFilters = [
    genreFilter !== 'all' ? { label: genreFilter, clear: () => setGenreFilter('all') } : null,
    levelFilter !== 'all' ? { label: levelFilter, clear: () => setLevelFilter('all') } : null,
    typeFilter !== 'all' ? { label: typeFilter, clear: () => setTypeFilter('all') } : null,
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const clearAll = () => {
    setGenreFilter('all');
    setLevelFilter('all');
    setTypeFilter('all');
  };

  const FilterGroup = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="py-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );

  const FilterRow = ({
    label,
    count,
    active,
    onClick,
  }: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm capitalize transition-colors ${
        active ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </button>
  );

  const Sidebar = (
    <div className="divide-y divide-border">
      <div className="flex items-center justify-between pb-3">
        <span className="font-semibold flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </span>
        {activeFilters.length > 0 && (
          <button onClick={clearAll} className="text-xs text-primary hover:underline">
            Clear all
          </button>
        )}
      </div>

      <FilterGroup title="Category">
        <FilterRow label="All categories" count={classes.length} active={genreFilter === 'all'} onClick={() => setGenreFilter('all')} />
        {genres.map((g) => (
          <FilterRow key={g} label={g} count={countBy((c) => c.genre === g)} active={genreFilter === g} onClick={() => setGenreFilter(g)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Skill Level">
        <FilterRow label="All levels" count={classes.length} active={levelFilter === 'all'} onClick={() => setLevelFilter('all')} />
        {LEVELS.map((l) => (
          <FilterRow key={l} label={l} count={countBy((c) => c.skill_level === l)} active={levelFilter === l} onClick={() => setLevelFilter(l)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Mode">
        <FilterRow label="Any mode" count={classes.length} active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
        {TYPES.map((t) => (
          <FilterRow key={t.value} label={t.label} count={countBy((c) => c.class_type === t.value)} active={typeFilter === t.value} onClick={() => setTypeFilter(t.value)} />
        ))}
      </FilterGroup>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Directory search bar */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold">Music Class Directory</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Search teachers, gharanas and lessons near you
              </p>
            </div>
            {canCreateClass ? (
              <Button onClick={() => navigate('/classes/create')} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" /> List a Class
              </Button>
            ) : !user ? (
              <Button
                variant="outline"
                className="gap-2 shrink-0"
                onClick={() => {
                  toast.error('Please sign in to list a class');
                  navigate('/login');
                }}
              >
                <Plus className="h-4 w-4" /> List a Class
              </Button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col md:flex-row gap-2 md:gap-0 md:items-stretch md:rounded-lg md:border md:border-border md:overflow-hidden md:shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="What are you looking for? e.g. Tabla, Khayal, teacher name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 md:border-0 md:rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Separator orientation="vertical" className="hidden md:block h-auto" />
            <div className="relative md:w-72">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Location or 'online'"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="pl-10 h-12 md:border-0 md:rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button className="h-12 md:rounded-none md:px-8 gap-2">
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="hidden lg:block sticky top-4 rounded-lg border border-border bg-card p-4">
              {Sidebar}
            </div>
            <Button
              variant="outline"
              className="lg:hidden w-full gap-2"
              onClick={() => setShowFilters((s) => !s)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
              {activeFilters.length > 0 && <Badge variant="secondary">{activeFilters.length}</Badge>}
            </Button>
            {showFilters && (
              <div className="lg:hidden mt-3 rounded-lg border border-border bg-card p-4">{Sidebar}</div>
            )}
          </aside>

          {/* Listings */}
          <main className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span> listing
                {filtered.length === 1 ? '' : 's'} found
                {locationQuery && <> near "{locationQuery}"</>}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Sort by</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger className="w-[170px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="name">Name A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {activeFilters.map((f) => (
                  <button
                    key={f.label}
                    onClick={f.clear}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs capitalize hover:bg-muted"
                  >
                    {f.label}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="h-40 animate-pulse bg-muted/40" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 rounded-lg border border-dashed border-border">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">No listings found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different search term or clear your filters.
                </p>
              </div>
            ) : (
              <ol className="space-y-3">
                {filtered.map((cls, i) => (
                  <li key={cls.id}>
                    <Card
                      className="p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
                      onClick={() => navigate(`/classes/${recordPath(cls)}`)}
                    >
                      <div className="flex gap-4">
                        <div className="hidden sm:flex w-8 shrink-0 justify-center pt-1">
                          <span className="text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                        </div>

                        <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                          {cls.image_url ? (
                            <img
                              src={cls.image_url}
                              alt={`${cls.title} music class listing`}
                              loading="lazy"
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="text-base sm:text-lg font-semibold text-primary hover:underline truncate">
                                {cls.title}
                              </h2>
                              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <UserIcon className="h-3.5 w-3.5" /> {cls.teacher_name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {cls.price != null ? (
                                <>
                                  <p className="text-lg font-bold">${cls.price}</p>
                                  <p className="text-xs text-muted-foreground">per session</p>
                                </>
                              ) : (
                                <p className="text-xs text-muted-foreground">Contact for pricing</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                            {cls.location_name && (
                              <span className="flex items-center gap-1 min-w-0">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{cls.location_name}</span>
                              </span>
                            )}
                            {cls.recurring_schedule && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {cls.recurring_schedule}
                              </span>
                            )}
                            {cls.max_capacity && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" /> Max {cls.max_capacity}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="secondary">{cls.genre}</Badge>
                            <Badge variant="outline" className="capitalize">{cls.skill_level}</Badge>
                            <Badge variant="outline" className="capitalize flex items-center gap-1">
                              {cls.class_type === 'online' ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                              {cls.class_type}
                            </Badge>
                          </div>

                          {cls.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{cls.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/classes/${recordPath(cls)}`);
                              }}
                              className="gap-1.5"
                            >
                              View Details <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                            {cls.contact_info && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3.5 w-3.5" /> {cls.contact_info}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ol>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
