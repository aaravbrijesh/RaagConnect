import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Music, MapPin, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Nav from '@/components/Nav';

const mockArtists = [
  {
    id: 1,
    name: 'The Midnight Waves',
    genre: 'Rock',
    location: 'Los Angeles, CA',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    bio: 'High-energy rock band with a modern edge'
  },
  {
    id: 2,
    name: 'Luna Martinez',
    genre: 'Jazz',
    location: 'New York, NY',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
    bio: 'Smooth jazz vocalist with international acclaim'
  },
  {
    id: 3,
    name: 'Electric Dreams',
    genre: 'Electronic',
    location: 'Miami, FL',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
    bio: 'Cutting-edge electronic music producers'
  },
  {
    id: 4,
    name: 'Sarah Chen',
    genre: 'Classical',
    location: 'San Francisco, CA',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    bio: 'World-renowned pianist and composer'
  },
  {
    id: 5,
    name: 'The Folk Collective',
    genre: 'Folk',
    location: 'Nashville, TN',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
    bio: 'Authentic folk music with modern storytelling'
  },
  {
    id: 6,
    name: 'DJ Pulse',
    genre: 'Hip Hop',
    location: 'Atlanta, GA',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    bio: 'Chart-topping hip hop artist and producer'
  }
];

export default function Artists() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArtists = mockArtists.filter(artist =>
    artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artist.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Nav />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Discover Artists
          </h1>
          <p className="text-muted-foreground text-lg">
            Find and connect with talented musicians
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by artist name or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-card/50 backdrop-blur-sm border-border/50"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtists.map((artist, index) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="overflow-hidden hover:shadow-glow transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50 group">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  <Badge className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm">
                    {artist.genre}
                  </Badge>
                </div>
                
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Music className="h-5 w-5 text-primary" />
                      {artist.name}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-normal">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {artist.rating}
                    </span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {artist.location}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{artist.bio}</p>
                  <Button className="w-full" variant="outline">
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredArtists.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Music className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No artists found</p>
            <p className="text-sm text-muted-foreground mt-2">Try searching with different keywords</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
