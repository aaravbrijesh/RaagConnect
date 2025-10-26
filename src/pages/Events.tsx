import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Ticket, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Nav from '@/components/Nav';

const mockEvents = [
  {
    id: 1,
    title: 'Summer Music Festival',
    artist: 'Various Artists',
    date: '2025-07-15',
    time: '6:00 PM',
    location: 'Central Park, NY',
    price: 75,
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600',
    category: 'Festival',
    availability: 'Available'
  },
  {
    id: 2,
    title: 'Luna Martinez Live',
    artist: 'Luna Martinez',
    date: '2025-06-20',
    time: '8:00 PM',
    location: 'Blue Note Jazz Club, NY',
    price: 45,
    image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600',
    category: 'Concert',
    availability: 'Limited'
  },
  {
    id: 3,
    title: 'Electronic Nights',
    artist: 'Electric Dreams',
    date: '2025-07-01',
    time: '10:00 PM',
    location: 'The Warehouse, Miami',
    price: 50,
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600',
    category: 'Club Night',
    availability: 'Available'
  },
  {
    id: 4,
    title: 'Classical Evening',
    artist: 'Sarah Chen',
    date: '2025-06-25',
    time: '7:30 PM',
    location: 'Symphony Hall, SF',
    price: 85,
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600',
    category: 'Classical',
    availability: 'Available'
  },
  {
    id: 5,
    title: 'Folk & Friends',
    artist: 'The Folk Collective',
    date: '2025-07-10',
    time: '7:00 PM',
    location: 'Ryman Auditorium, Nashville',
    price: 40,
    image: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=600',
    category: 'Concert',
    availability: 'Sold Out'
  },
  {
    id: 6,
    title: 'Hip Hop Block Party',
    artist: 'DJ Pulse',
    date: '2025-08-05',
    time: '5:00 PM',
    location: 'Piedmont Park, Atlanta',
    price: 35,
    image: 'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=600',
    category: 'Festival',
    availability: 'Available'
  }
];

export default function Events() {
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredEvents = categoryFilter === 'all'
    ? mockEvents
    : mockEvents.filter(event => event.category === categoryFilter);

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
            Upcoming Events
          </h1>
          <p className="text-muted-foreground text-lg">
            Book tickets to amazing live performances
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 flex items-center gap-4"
        >
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 bg-card/50 backdrop-blur-sm border-border/50">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="Concert">Concerts</SelectItem>
              <SelectItem value="Festival">Festivals</SelectItem>
              <SelectItem value="Club Night">Club Nights</SelectItem>
              <SelectItem value="Classical">Classical</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="overflow-hidden hover:shadow-glow transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50 group">
                <div className="flex flex-col md:flex-row">
                  <div className="relative w-full md:w-64 h-48 overflow-hidden">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/50 to-transparent" />
                    <Badge className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm">
                      {event.category}
                    </Badge>
                    {event.availability === 'Sold Out' && (
                      <Badge className="absolute bottom-4 left-4 bg-destructive/90 backdrop-blur-sm">
                        Sold Out
                      </Badge>
                    )}
                    {event.availability === 'Limited' && (
                      <Badge className="absolute bottom-4 left-4 bg-yellow-500/90 backdrop-blur-sm">
                        Limited Tickets
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <CardHeader>
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      <CardDescription className="text-base">{event.artist}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{event.time}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{event.location}</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-5 w-5 text-primary" />
                          <span className="text-2xl font-bold">${event.price}</span>
                        </div>
                        
                        <Button 
                          disabled={event.availability === 'Sold Out'}
                          className="min-w-32"
                        >
                          {event.availability === 'Sold Out' ? 'Sold Out' : 'Book Now'}
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No events found</p>
            <p className="text-sm text-muted-foreground mt-2">Try selecting a different category</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
