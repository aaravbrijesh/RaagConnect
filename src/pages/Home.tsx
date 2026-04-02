import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Music, Users, Heart, GraduationCap, Ticket, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Nav from '@/components/Nav';
import { useNavigate } from 'react-router-dom';

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
  heroDescription: "Your home for Indian classical music — discover events, connect with artists, book classes, and join a vibrant community of rasikas and performers.",
  missionText: "Raag Connect bridges the gap between Indian classical music artists and audiences worldwide. Whether you're a seasoned performer looking to share your art, a student searching for a guru, or a rasika hunting for the next great concert, this is your platform.",
  feature1Title: "Discover Events",
  feature1Text: "Browse upcoming concerts and mehfils with powerful search, date filters, location-based discovery, and an interactive map to find performances near you.",
  feature2Title: "Artist Profiles",
  feature2Text: "Explore detailed profiles of Hindustani and Carnatic musicians — vocalists, instrumentalists, and percussionists — and connect with your favorites.",
  feature3Title: "Book Classes",
  feature3Text: "Find 1-on-1 or group classes with teachers across instruments and vocal styles. Book slots directly, sync with your calendar, and set up recurring sessions.",
  contactEmail: "contact@raagconnect.com"
};

export default function Home() {
  const { needsRoleSelection } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<AboutContent>(defaultContent);
  const [title, setTitle] = useState("Raag Connect");
  const [stats, setStats] = useState({ events: 0, artists: 0, classes: 0 });

  useEffect(() => {
    if (needsRoleSelection) {
      navigate('/select-role');
    }
  }, [needsRoleSelection, navigate]);

  useEffect(() => {
    fetchContent();
    fetchStats();
  }, []);

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from('site_content')
      .select('title, content')
      .eq('page_key', 'about')
      .maybeSingle();

    if (data && !error) {
      setTitle(data.title || "Raag Connect");
      const parsed = data.content as unknown as AboutContent;
      setContent({ ...defaultContent, ...parsed });
    }
  };

  const fetchStats = async () => {
    const [eventsRes, artistsRes, classesRes] = await Promise.all([
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('artists').select('id', { count: 'exact', head: true }),
      supabase.from('classes').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      events: eventsRes.count ?? 0,
      artists: artistsRes.count ?? 0,
      classes: classesRes.count ?? 0,
    });
  };

  const features = [
    { icon: Calendar, title: content.feature1Title, text: content.feature1Text, action: 'Browse Events', href: '/events' },
    { icon: Users, title: content.feature2Title, text: content.feature2Text, action: 'Browse Artists', href: '/events' },
    { icon: GraduationCap, title: content.feature3Title, text: content.feature3Text, action: 'Browse Classes', href: '/classes' },
  ];

  const statItems = [
    { label: 'Events', value: stats.events, icon: Ticket },
    { label: 'Artists', value: stats.artists, icon: Music },
    { label: 'Classes', value: stats.classes, icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-12 text-center max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {content.heroDescription}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2" onClick={() => navigate('/events')}>
              <Calendar className="h-5 w-5" />
              Explore Events & Artists
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate('/classes')}>
              <GraduationCap className="h-5 w-5" />
              Find Classes
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Live Stats */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {statItems.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-4 rounded-xl bg-card border"
            >
              <s.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="container mx-auto px-4 py-10 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card border rounded-xl p-8 space-y-4"
        >
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            Our Mission
          </h2>
          <p className="text-muted-foreground leading-relaxed">{content.missionText}</p>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border rounded-xl p-6 space-y-3 flex flex-col"
            >
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground flex-1">{f.text}</p>
              <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2" onClick={() => navigate(f.href)}>
                {f.action}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="container mx-auto px-4 py-12 max-w-3xl text-center border-t">
        <h2 className="text-2xl font-semibold mb-3">Get in Touch</h2>
        <p className="text-muted-foreground mb-2">Have questions or feedback? We'd love to hear from you.</p>
        <p className="text-primary font-medium">{content.contactEmail}</p>
      </section>
    </div>
  );
}
