import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Users, Calendar, Heart } from 'lucide-react';
import Nav from '@/components/Nav';
import { supabase } from '@/integrations/supabase/client';

interface AboutContent {
  heroDescription: string;
  missionText: string;
  feature1Title: string;
  feature1Text: string;
  feature2Title: string;
  feature2Text: string;
  feature3Title: string;
  feature3Text: string;
  contactEmail: string;
}

const defaultContent: AboutContent = {
  heroDescription: "Connecting classical music lovers with artists and events in their community",
  missionText: "Raag Connect was created to bridge the gap between Indian classical music artists and audiences. We believe that this rich musical tradition deserves a dedicated platform where artists can showcase their talents and music lovers can discover live performances in their area.",
  feature1Title: "Discover Events",
  feature1Text: "Find classical music concerts and performances happening near you with our location-based event discovery.",
  feature2Title: "Connect with Artists",
  feature2Text: "Browse artist profiles, learn about their specializations, and follow your favorite performers.",
  feature3Title: "Book Performances",
  feature3Text: "Easily book tickets to events and support the artists who keep this musical tradition alive.",
  contactEmail: "contact@raagconnect.com"
};

export default function About() {
  const [content, setContent] = useState<AboutContent>(defaultContent);
  const [title, setTitle] = useState("About Raag Connect");

  useEffect(() => {
    const fetchContent = async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('title, content')
        .eq('page_key', 'about')
        .maybeSingle();

      if (data && !error) {
        setTitle(data.title || "About Raag Connect");
        const parsedContent = data.content as unknown as AboutContent;
        setContent({ ...defaultContent, ...parsedContent });
      }
    };

    fetchContent();
  }, []);

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
            <h1 className="text-4xl md:text-5xl font-bold">{title}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {content.heroDescription}
            </p>
          </div>

          {/* Mission Section */}
          <div className="bg-card border rounded-xl p-8 space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              Our Mission
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {content.missionText}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <Calendar className="h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">{content.feature1Title}</h3>
              <p className="text-sm text-muted-foreground">
                {content.feature1Text}
              </p>
            </div>
            
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <Users className="h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">{content.feature2Title}</h3>
              <p className="text-sm text-muted-foreground">
                {content.feature2Text}
              </p>
            </div>
            
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <Music className="h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">{content.feature3Title}</h3>
              <p className="text-sm text-muted-foreground">
                {content.feature3Text}
              </p>
            </div>
          </div>

          {/* Contact Section */}
          <div className="text-center space-y-4 pt-8 border-t">
            <h2 className="text-2xl font-semibold">Get in Touch</h2>
            <p className="text-muted-foreground">
              Have questions or feedback? We'd love to hear from you.
            </p>
            <p className="text-primary font-medium">{content.contactEmail}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}