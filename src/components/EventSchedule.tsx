import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string | null;
}

interface EventScheduleProps {
  eventId: string;
  canEdit: boolean;
}

export default function EventSchedule({ eventId, canEdit }: EventScheduleProps) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ time: "", title: "", description: "" });

  useEffect(() => {
    fetchSchedule();
  }, [eventId]);

  const fetchSchedule = async () => {
    const { data, error } = await supabase
      .from("event_schedule")
      .select("*")
      .eq("event_id", eventId)
      .order("time", { ascending: true });

    if (error) {
      console.error("Error fetching schedule:", error);
    } else {
      setSchedule(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!formData.time || !formData.title.trim()) {
      toast.error("Please fill in time and title");
      return;
    }

    const { error } = await supabase.from("event_schedule").insert({
      event_id: eventId,
      time: formData.time,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
    });

    if (error) {
      toast.error("Failed to add schedule item");
      console.error(error);
    } else {
      toast.success("Schedule item added");
      setFormData({ time: "", title: "", description: "" });
      setShowAddForm(false);
      fetchSchedule();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.time || !formData.title.trim()) {
      toast.error("Please fill in time and title");
      return;
    }

    const { error } = await supabase
      .from("event_schedule")
      .update({
        time: formData.time,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update schedule item");
      console.error(error);
    } else {
      toast.success("Schedule updated");
      setEditingId(null);
      setFormData({ time: "", title: "", description: "" });
      fetchSchedule();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("event_schedule").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete schedule item");
      console.error(error);
    } else {
      toast.success("Schedule item removed");
      fetchSchedule();
    }
  };

  const startEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setFormData({
      time: item.time,
      title: item.title,
      description: item.description || "",
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ time: "", title: "", description: "" });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading schedule...</p>;
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Event Schedule
          </span>
          {canEdit && !showAddForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
                setFormData({ time: "", title: "", description: "" });
              }}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAddForm && canEdit && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-3 border border-border/50">
            <div className="grid grid-cols-3 gap-3">
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                placeholder="Time"
              />
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Title (e.g., Raga Yaman)"
                className="col-span-2"
              />
            </div>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description (optional)"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {schedule.length === 0 && !showAddForm ? (
          <p className="text-muted-foreground text-sm text-center py-4">Coming Soon</p>
        ) : (
          <div className="space-y-2">
            {schedule.map((item) => (
              <div key={item.id}>
                {editingId === item.id ? (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3 border border-border/50">
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      />
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Title"
                        className="col-span-2"
                      />
                    </div>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description (optional)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(item.id)}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors group">
                    <div className="text-primary font-medium whitespace-nowrap min-w-[80px]">
                      {formatTime(item.time)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.title}</p>
                      {item.description && <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(item)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
