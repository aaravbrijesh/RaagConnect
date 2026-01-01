import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

export default function AboutPageEditor() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("About Raag Connect");
  const [content, setContent] = useState<AboutContent>(defaultContent);

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
      setLoading(false);
    };

    fetchContent();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_content')
        .update({
          title,
          content: JSON.parse(JSON.stringify(content)),
          updated_by: user.id,
        })
        .eq('page_key', 'about');

      if (error) throw error;
      toast.success('About page updated successfully!');
    } catch (error: any) {
      toast.error('Error saving: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateContent = (key: keyof AboutContent, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Edit About Page
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Page Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="heroDescription">Hero Description</Label>
          <Textarea
            id="heroDescription"
            value={content.heroDescription}
            onChange={(e) => updateContent('heroDescription', e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="missionText">Mission Text</Label>
          <Textarea
            id="missionText"
            value={content.missionText}
            onChange={(e) => updateContent('missionText', e.target.value)}
            rows={4}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="feature1Title">Feature 1 Title</Label>
            <Input
              id="feature1Title"
              value={content.feature1Title}
              onChange={(e) => updateContent('feature1Title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feature1Text">Feature 1 Description</Label>
            <Textarea
              id="feature1Text"
              value={content.feature1Text}
              onChange={(e) => updateContent('feature1Text', e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="feature2Title">Feature 2 Title</Label>
            <Input
              id="feature2Title"
              value={content.feature2Title}
              onChange={(e) => updateContent('feature2Title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feature2Text">Feature 2 Description</Label>
            <Textarea
              id="feature2Text"
              value={content.feature2Text}
              onChange={(e) => updateContent('feature2Text', e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="feature3Title">Feature 3 Title</Label>
            <Input
              id="feature3Title"
              value={content.feature3Title}
              onChange={(e) => updateContent('feature3Title', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feature3Text">Feature 3 Description</Label>
            <Textarea
              id="feature3Text"
              value={content.feature3Text}
              onChange={(e) => updateContent('feature3Text', e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={content.contactEmail}
            onChange={(e) => updateContent('contactEmail', e.target.value)}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}