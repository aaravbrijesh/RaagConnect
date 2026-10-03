import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Nav from "@/components/Nav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Music, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface Detection {
  id: string;
  raag_name: string;
  confidence: string;
  analysis: string;
  source: string | null;
  created_at: string;
  result: any;
}

export default function RaagHistory() {
  const { user } = useAuth();
  const [items, setItems] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data, error } = await (supabase as any)
        .from("raag_detections")
        .select("id, raag_name, confidence, analysis, source, created_at, result")
        .order("created_at", { ascending: false });
      if (error) toast.error("Could not load your history");
      setItems((data as Detection[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("raag_detections").delete().eq("id", id);
    if (error) return toast.error("Could not delete");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button asChild variant="ghost" className="gap-2 mb-4">
          <Link to="/raag-detector"><ArrowLeft className="h-4 w-4" /> Back to Raag Detector</Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground mb-2">Raag History</h1>
        <p className="text-muted-foreground mb-8">All your past detections.</p>

        {!user ? (
          <p className="text-muted-foreground">Sign in to see your history.</p>
        ) : loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <Card><CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">No detections yet.</p>
            <Button asChild><Link to="/raag-detector">Identify a raag</Link></Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {items.map((d) => {
              const r = d.result || {};
              const expanded = open === d.id;
              return (
                <Card key={d.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Music className="h-5 w-5 text-primary" /> Raag {d.raag_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(d.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                          {d.source ? ` · ${d.source}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{d.confidence} confidence</Badge>
                        {r.multiple_raags && <Badge variant="secondary">Multiple raags</Badge>}
                        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className={`text-sm text-muted-foreground whitespace-pre-line ${expanded ? "" : "line-clamp-3"}`}>{d.analysis}</p>
                    {expanded && (
                      <div className="space-y-3">
                        {r.key_notes_evidence && (
                          <div><p className="text-sm font-semibold">Notes that gave it away</p><p className="text-sm text-muted-foreground">{r.key_notes_evidence}</p></div>
                        )}
                        {Array.isArray(r.sections) && r.sections.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">Section by section</p>
                            {r.sections.map((s: any, i: number) => (
                              <div key={i} className="rounded-lg border p-3">
                                <p className="text-xs text-muted-foreground">{s.section}</p>
                                <p className="text-sm font-medium">Raag {s.raag}</p>
                                <p className="text-sm text-muted-foreground">{s.notes}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {r.alternative_raags && (
                          <div><p className="text-sm font-semibold">Alternatives</p><p className="text-sm text-muted-foreground">{r.alternative_raags}</p></div>
                        )}
                      </div>
                    )}
                    <Button variant="link" className="px-0 gap-1" onClick={() => setOpen(expanded ? null : d.id)}>
                      {expanded ? <>Show less <ChevronUp className="h-4 w-4" /></> : <>Show full analysis <ChevronDown className="h-4 w-4" /></>}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
