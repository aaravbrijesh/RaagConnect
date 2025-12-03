import React from 'react';
import { motion } from 'framer-motion';
import { Music, Users, Calendar, Heart } from 'lucide-react';
import Nav from '@/components/Nav';

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">About Raag Connect</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connecting classical music lovers with artists and events in their community
            </p>
          </div>

          {/* Mission Section */}
          <div className="bg-card border rounded-xl p-8 space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              Our Mission
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Raag Connect was created to bridge the gap between Indian classical music artists 
              and audiences. We believe that this rich musical tradition deserves a dedicated 
              platform where artists can showcase their talents and music lovers can discover 
              live performances in their area.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <Calendar className="h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">Discover Events</h3>
              <p className="text-sm text-muted-foreground">
                Find classical music concerts and performances happening near you with our 
                location-based event discovery.
              </p>
            </div>
            
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <Users className="h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">Connect with Artists</h3>
              <p className="text-sm text-muted-foreground">
                Browse artist profiles, learn about their specializations, and follow your 
                favorite performers.
              </p>
            </div>
            
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <Music className="h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">Book Performances</h3>
              <p className="text-sm text-muted-foreground">
                Easily book tickets to events and support the artists who keep this 
                musical tradition alive.
              </p>
            </div>
          </div>

          {/* Contact Section */}
          <div className="text-center space-y-4 pt-8 border-t">
            <h2 className="text-2xl font-semibold">Get in Touch</h2>
            <p className="text-muted-foreground">
              Have questions or feedback? We'd love to hear from you.
            </p>
            <p className="text-primary font-medium">contact@raagconnect.com</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
