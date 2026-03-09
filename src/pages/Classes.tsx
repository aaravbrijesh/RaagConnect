import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useNavigate } from 'react-router-dom';
import Nav from '@/components/Nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, MapPin, DollarSign, Users, Clock, Search, Plus, Globe, User as UserIcon } from 'lucide-react';
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
  teacher_name?: string;
}

export default function Classes() {
  const { user } = useAuth();
  const { isArtist, isOrganizer, isAdmin, hasRole } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

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

      // Fetch teacher names from profiles
      const userIds = [...new Set(data?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      setClasses(data?.map(c => ({
        ...c,
        teacher_name: nameMap.get(c.user_id) || 'Unknown Teacher'
      })) || []);
    } catch (error: any) {
      toast.error('Failed to load classes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const genres = [...new Set(classes.map(c => c.genre))].sort();

  const filtered = classes.filter(c => {
    const matchesSearch = !search || 
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.teacher_name?.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = genreFilter === 'all' || c.genre === genreFilter;
    const matchesLevel = levelFilter === 'all' || c.skill_level === levelFilter;
    const matchesType = typeFilter === 'all' || c.class_type === typeFilter;
    return matchesSearch && matchesGenre && matchesLevel && matchesType;
  });

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Discover Classes
            </h1>
            <p className="text-muted-foreground mt-1">Find teachers and learn classical music</p>
          </div>
          {canCreateClass ? (
            <Button onClick={() => navigate('/classes/create')} className="gap-2">
              <Plus className="h-4 w-4" />
              List a Class
            </Button>
          ) : user ? null : (
            <Button onClick={() => { toast.error('Please sign in to list a class'); navigate('/login'); }} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              List a Class
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classes or teachers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger><SelectValue placeholder="Genre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="in-person">In-Person</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading classes...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No classes found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {canCreateClass ? 'Be the first to list a class!' : 'Check back soon for new listings.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((cls, i) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="cursor-pointer"
                onClick={() => navigate(`/classes/${cls.id}`)}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                  {cls.image_url && (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={cls.image_url}
                        alt={cls.title}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">{cls.title}</CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="secondary">{cls.genre}</Badge>
                      <Badge variant="outline" className="capitalize">{cls.skill_level}</Badge>
                      <Badge variant="outline" className="capitalize flex items-center gap-1">
                        {cls.class_type === 'online' ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {cls.class_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {cls.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{cls.description}</p>
                    )}
                    <div className="mt-auto space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserIcon className="h-3.5 w-3.5" />
                        <span>{cls.teacher_name}</span>
                      </div>
                      {cls.location_name && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{cls.location_name}</span>
                        </div>
                      )}
                      {cls.recurring_schedule && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{cls.recurring_schedule}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        {cls.price != null ? (
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {cls.price}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Contact for pricing</span>
                        )}
                        {cls.max_capacity && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Max {cls.max_capacity}
                          </span>
                        )}
                      </div>
                      {cls.contact_info && (
                        <p className="text-xs text-primary pt-1">Contact: {cls.contact_info}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
