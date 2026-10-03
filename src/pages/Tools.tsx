import React, { useState, useRef, useCallback } from "react";
import Nav from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, Upload, Music, Loader2, AlertCircle, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Link } from "react-router-dom";
import { History, Info, ShieldAlert } from "lucide-react";

interface RaagResult {
  raag_name: string;
  confidence: string;
  thaat?: string;
  aroh?: string;
  avroh?: string;
  vadi?: string;
  samvadi?: string;
  pakad?: string;
  time_of_day?: string;
  mood?: string;
  notes_detected?: string;
  analysis: string;
  alternative_raags?: string;
  key_notes_evidence?: string;
  multiple_raags?: boolean;
  sections?: { section: string; raag: string; notes: string }[];
}

export default function Tools() {
  const { requireAuth, isAuthenticated } = useAuthGuard();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<RaagResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = useCallback(async () => {
    if (!requireAuth('use the raag identifier')) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setResult(null);
      toast.info("Recording started — sing or play into your mic!");
    } catch {
      toast.error("Could not access microphone. Please allow mic permissions.");
    }
  }, [requireAuth]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    toast.success("Recording saved!");
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!requireAuth('use the raag identifier')) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error("Please upload an audio file (MP3, WAV, etc.)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large. Please upload a file under 20MB.");
      return;
    }
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setResult(null);
    toast.success(`Loaded: ${file.name}`);
  };

  const analyzeRaag = async () => {
    if (!audioBlob) return;
    if (!requireAuth('analyze raag')) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const mimeType = audioBlob.type || 'audio/webm';

      const { data, error } = await supabase.functions.invoke('analyze-raag', {
        body: { audioBase64: base64, mimeType, source: audioBlob instanceof File ? audioBlob.name : 'Mic recording' },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Analysis failed');

      setResult(data.data);
      toast.success(`Identified: Raag ${data.data.raag_name}`);
    } catch (err: any) {
      console.error('Raag analysis error:', err);
      toast.error(err.message || 'Failed to analyze audio');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confidenceColor = (c: string) => {
    if (c === 'high') return 'bg-green-500/10 text-green-700 border-green-300';
    if (c === 'medium') return 'bg-yellow-500/10 text-yellow-700 border-yellow-300';
    return 'bg-red-500/10 text-red-700 border-red-300';
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Raag Detector</h1>
              <p className="text-muted-foreground">Find out which Hindustani raag a piece of music is built on — and why.</p>
            </div>
            {isAuthenticated && (
              <Button asChild variant="outline" className="gap-2">
                <Link to="/raag-detector/history"><History className="h-4 w-4" /> My history</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> What you can use</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Any music works — a classical recording, a <strong>Bollywood or film song</strong>, a bhajan, or just <strong>hum or sing a tune</strong> into your mic.</p>
              <p>We'll tell you the raag and the <strong>notes and phrases</strong> we heard that point to it.</p>
              <p>Songs often change raag along the way — the first stanza may be in one raag and the second in another. When that happens, we call out each part separately.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> For learning only</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>This tool is for <strong>educational purposes</strong> only. Your audio is analyzed and not published or shared — this is not a place to host or stream music.</p>
              <p>Please only upload short clips you have the right to use. RaagConnect is not responsible for copyright infringement in content you upload.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Mic className="h-4 w-4 text-primary" /> How to hum a song</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Find a quiet spot and hold your phone or laptop about an arm's length away.</li>
                <li>Tap <strong>Start Recording</strong> and hum or sing "aa" — words aren't needed.</li>
                <li>Hum the main tune slowly for 20–60 seconds. Include the parts that go up and come back down.</li>
                <li>Stay on one steady pitch for your starting note (your "Sa") now and then.</li>
                <li>Tap <strong>Stop</strong>, listen back, then <strong>Identify Raag</strong>.</li>
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Music className="h-4 w-4 text-primary" /> What the AI listens for</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Notes used</strong> — which swaras appear, and which are komal (flat) or teevra (sharp).</li>
                <li><strong>Going up and down</strong> — the aroh and avroh, including notes skipped in one direction.</li>
                <li><strong>Key phrases</strong> — the pakad, the signature turns that make a raag recognizable.</li>
                <li><strong>Important notes</strong> — the vadi and samvadi it lingers on most.</li>
                <li><strong>Changes</strong> — whether a later part of the song moves into a different raag.</li>
              </ul>
              <p className="mt-2">Every result is saved to <Link to="/raag-detector/history" className="text-primary underline-offset-4 hover:underline">My history</Link>.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Identify a raag</CardTitle>
                <CardDescription>
                  Record or upload audio and our AI will identify the Hindustani raag, including scale, characteristic phrases, and mood.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Section */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-3">
                <p className="text-sm font-medium text-foreground">Record from microphone</p>
                {!isRecording ? (
                  <Button onClick={startRecording} variant="outline" className="w-full gap-2" disabled={isAnalyzing}>
                    <Mic className="h-4 w-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive" className="w-full gap-2 animate-pulse">
                    <Square className="h-4 w-4" />
                    Stop Recording
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-center text-muted-foreground text-sm">or</div>

              <div className="flex-1 space-y-3">
                <p className="text-sm font-medium text-foreground">Upload audio file</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isAnalyzing || isRecording}
                >
                  <Upload className="h-4 w-4" />
                  Upload File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* Audio Preview */}
            {audioUrl && (
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Volume2 className="h-4 w-4" />
                  Audio loaded — preview below
                </div>
                <audio controls src={audioUrl} className="w-full" />
                <Button
                  onClick={analyzeRaag}
                  disabled={isAnalyzing}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing with AI (this may take a moment)...
                    </>
                  ) : (
                    <>
                      <Music className="h-4 w-4" />
                      Identify Raag
                    </>
                  )}
                </Button>
              </div>
            )}

            {isAnalyzing && (
              <div className="space-y-2">
                <Progress value={undefined} className="h-2 animate-pulse" />
                <p className="text-sm text-muted-foreground text-center">
                  Listening to the audio and analyzing swaras, phrases, and melodic patterns...
                </p>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-6 pt-4 border-t">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Identified Raag</p>
                    <h2 className="text-2xl font-bold text-foreground">Raag {result.raag_name}</h2>
                  </div>
                  <Badge variant="outline" className={confidenceColor(result.confidence)}>
                    {result.confidence} confidence
                  </Badge>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.thaat && (
                    <DetailCard label="Thaat (Parent Scale)" value={result.thaat} />
                  )}
                  {result.aroh && (
                    <DetailCard label="Aroh (Ascending)" value={result.aroh} />
                  )}
                  {result.avroh && (
                    <DetailCard label="Avroh (Descending)" value={result.avroh} />
                  )}
                  {result.vadi && (
                    <DetailCard label="Vadi (Primary Note)" value={result.vadi} />
                  )}
                  {result.samvadi && (
                    <DetailCard label="Samvadi (Secondary Note)" value={result.samvadi} />
                  )}
                  {result.pakad && (
                    <DetailCard label="Pakad (Signature Phrase)" value={result.pakad} />
                  )}
                  {result.time_of_day && (
                    <DetailCard label="Time of Performance" value={result.time_of_day} />
                  )}
                  {result.mood && (
                    <DetailCard label="Mood / Rasa" value={result.mood} />
                  )}
                  {result.notes_detected && (
                    <DetailCard label="Notes Detected" value={result.notes_detected} />
                  )}
                </div>

                {/* Analysis */}
                <div className="p-4 rounded-lg border bg-muted/20">
                  <p className="text-sm font-medium text-foreground mb-2">Detailed Analysis</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.analysis}</p>
                </div>

                {result.multiple_raags && result.sections && result.sections.length > 1 && (
                  <div className="p-4 rounded-lg border border-primary/40 bg-primary/5">
                    <p className="text-sm font-semibold text-foreground">This recording moves between raags</p>
                    <p className="text-sm text-muted-foreground">Different parts of the song use different raags — see the breakdown below.</p>
                  </div>
                )}
                {result.key_notes_evidence && (
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm font-semibold text-foreground mb-1">Notes that gave it away</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{result.key_notes_evidence}</p>
                  </div>
                )}
                {result.sections && result.sections.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Section by section</p>
                    {result.sections.map((sec, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground">{sec.section}</p>
                        <p className="text-sm font-medium text-foreground">Raag {sec.raag}</p>
                        <p className="text-sm text-muted-foreground">{sec.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
                {result.alternative_raags && (
                  <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10 dark:border-yellow-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Alternative Possibilities</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">{result.alternative_raags}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <div className="text-center p-6 rounded-lg border border-dashed">
                <p className="text-muted-foreground">Sign in to use the Raag Detector</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
