import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Music, Search, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import Nav from '@/components/Nav';

type Artist = {
  id: string;
  name: string;
  genre: string;
  image_url: string | null;
  location_name: string | null;
};

export default function SelectArtistForEvent() {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name, genre, image_url, location_name')
      .order('name');
    
    if (!error && data) {
      setArtists(data);
    }
    setLoading(false);
  };

  const handleSelectArtist = (artist: Artist) => {
    const savedData = sessionStorage.getItem('eventFormData');
    const formData = savedData ? JSON.parse(savedData) : {};
    
    // Get existing artistIds or create new array
    const existingIds = formData.artistIds || [];
    // Add artist if not already selected
    if (!existingIds.includes(artist.id)) {
      formData.artistIds = [...existingIds, artist.id];
    }
    
    sessionStorage.setItem('eventFormData', JSON.stringify(formData));
    navigate('/events/create');
  };

  const handleCreateNewArtist = () => {
    navigate('/events/create/createartist');
  };

  const handleBack = () => {
    navigate('/events/create');
  };

  const filteredArtists = artists.filter(artist =>
    artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artist.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Event Creation
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Select an Artist</h1>
          <p className="text-muted-foreground">Choose an artist to feature at your event</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artists by name or specialization..."
              className="pl-10"
            />
          </div>
          <Button onClick={handleCreateNewArtist} className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Artist
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading artists...</p>
          </div>
        ) : filteredArtists.length === 0 ? (
          <div className="text-center py-12">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'No artists found matching your search' : 'No artists available yet'}
            </p>
            <Button onClick={handleCreateNewArtist}>Create First Artist</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredArtists.map((artist, index) => (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden group"
                  onClick={() => handleSelectArtist(artist)}
                >
                  <div className="aspect-square relative overflow-hidden bg-muted">
                    {artist.image_url ? (
                      <img
                        src={artist.image_url}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-sm font-medium">Click to select</p>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1 truncate">{artist.name}</h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {artist.genre.split(', ').slice(0, 2).map((g) => (
                        <Badge key={g} variant="secondary" className="text-xs">
                          {g}
                        </Badge>
                      ))}
                      {artist.genre.split(', ').length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{artist.genre.split(', ').length - 2}
                        </Badge>
                      )}
                    </div>
                    {artist.location_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {artist.location_name}
                      </p>
                    )}
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
