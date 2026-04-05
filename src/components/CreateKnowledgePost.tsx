import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Music, X, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const CATEGORIES = [
  { value: "raag", label: "Raag" },
  { value: "composition", label: "Composition / Bandish" },
  { value: "taal", label: "Taal / Rhythm" },
  { value: "notation", label: "Notation / Sargam" },
  { value: "history", label: "History & Theory" },
  { value: "general", label: "General" },
];

interface Props {
  onPostCreated: () => void;
}

export default function CreateKnowledgePost({ onPostCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAudioFile(file);
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${folder}/${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from("knowledge-media").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("knowledge-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      let image_url: string | null = null;
      let audio_url: string | null = null;

      if (imageFile) image_url = await uploadFile(imageFile, "images");
      if (audioFile) audio_url = await uploadFile(audioFile, "audio");

      const { error } = await supabase.from("knowledge_posts").insert({
        user_id: user.id,
        title,
        content,
        category,
        image_url,
        audio_url,
      });

      if (error) throw error;

      toast({ title: "Post shared!", description: "Your knowledge has been shared with the community." });
      setTitle("");
      setContent("");
      setCategory("general");
      setImageFile(null);
      setAudioFile(null);
      setImagePreview(null);
      setExpanded(false);
      onPostCreated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  if (!expanded) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpanded(true)}>
        <CardContent className="p-4">
          <p className="text-muted-foreground">Share your musical knowledge...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Share Knowledge</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Title (e.g. Raag Yaman - An Introduction)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Share sargam notation, compositions, historical context, or anything about Indian classical music..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={5}
          />

          {imagePreview && (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-24 rounded-md object-cover" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {audioFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Music className="h-4 w-4" />
              <span>{audioFile.name}</span>
              <button type="button" onClick={() => setAudioFile(null)}>
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <div className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-secondary">
                  <ImagePlus className="h-4 w-4" />
                  <span>Image</span>
                </div>
              </label>
              <label className="cursor-pointer">
                <input type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
                <div className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-secondary">
                  <Music className="h-4 w-4" />
                  <span>Audio</span>
                </div>
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting || !title || !content}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
