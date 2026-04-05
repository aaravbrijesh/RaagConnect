import React, { useState, useEffect } from "react";
import Nav from "@/components/Nav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CreateKnowledgePost from "@/components/CreateKnowledgePost";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Music, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "raag", label: "Raag" },
  { value: "composition", label: "Composition / Bandish" },
  { value: "taal", label: "Taal / Rhythm" },
  { value: "notation", label: "Notation / Sargam" },
  { value: "history", label: "History & Theory" },
  { value: "general", label: "General" },
];

const CATEGORY_COLORS: Record<string, string> = {
  raag: "bg-primary/10 text-primary border-primary/20",
  composition: "bg-accent/10 text-accent-foreground border-accent/20",
  taal: "bg-secondary text-secondary-foreground border-secondary",
  notation: "bg-muted text-muted-foreground border-muted",
  history: "bg-primary/5 text-primary border-primary/10",
  general: "bg-secondary text-secondary-foreground border-secondary",
};

interface KnowledgePost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
  author_name?: string;
}

export default function Knowledge() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<KnowledgePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("knowledge_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterCategory !== "all") {
        query = query.eq("category", filterCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch author names
      const userIds = [...new Set((data || []).map((p) => p.user_id))];
      let profileMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        if (profiles) {
          profiles.forEach((p) => {
            if (p.full_name) profileMap[p.user_id] = p.full_name;
          });
        }

        // Also check artist names
        const { data: artists } = await supabase
          .from("artists")
          .select("user_id, name")
          .in("user_id", userIds);

        if (artists) {
          artists.forEach((a) => {
            if (!profileMap[a.user_id]) profileMap[a.user_id] = a.name;
          });
        }
      }

      setPosts(
        (data || []).map((p) => ({
          ...p,
          author_name: profileMap[p.user_id] || "Anonymous",
        }))
      );
    } catch (err) {
      console.error("Error fetching knowledge posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [filterCategory]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Knowledge</h1>
          </div>
          <p className="text-muted-foreground">
            Share and explore the ancient wisdom of Indian classical music — raags, compositions, taal, and more.
          </p>
        </div>

        {/* Create Post */}
        {session && (
          <div className="mb-6">
            <CreateKnowledgePost onPostCreated={fetchPosts} />
          </div>
        )}

        {/* Filter */}
        <div className="mb-6">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No posts yet.</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {session ? "Be the first to share some musical knowledge!" : "Sign in to share your knowledge."}
                </p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-foreground leading-tight">{post.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={CATEGORY_COLORS[post.category] || ""}>
                          {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">
                              {post.author_name?.charAt(0).toUpperCase() || "A"}
                            </AvatarFallback>
                          </Avatar>
                          <span>{post.author_name}</span>
                          <span>·</span>
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.content}</p>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="mt-4 rounded-lg w-full max-h-96 object-cover"
                    />
                  )}

                  {post.audio_url && (
                    <div className="mt-4 flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary shrink-0" />
                      <audio controls className="w-full h-10" src={post.audio_url} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
