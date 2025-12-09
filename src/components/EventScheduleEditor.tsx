import { useState } from "react";
import { Clock, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
}

interface EventScheduleEditorProps {
  schedule: ScheduleItem[];
  onChange: (schedule: ScheduleItem[]) => void;
}

export default function EventScheduleEditor({ schedule, onChange }: EventScheduleEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ time: "", title: "", description: "" });

  const handleAdd = () => {
    if (!formData.time || !formData.title.trim()) return;

    const newItem: ScheduleItem = {
      id: `temp-${Date.now()}`,
      time: formData.time,
      title: formData.title.trim(),
      description: formData.description.trim(),
    };

    onChange([...schedule, newItem].sort((a, b) => a.time.localeCompare(b.time)));
    setFormData({ time: "", title: "", description: "" });
    setShowAddForm(false);
  };

  const handleUpdate = (id: string) => {
    if (!formData.time || !formData.title.trim()) return;

    const updated = schedule.map((item) =>
      item.id === id
        ? { ...item, time: formData.time, title: formData.title.trim(), description: formData.description.trim() }
        : item
    );

    onChange(updated.sort((a, b) => a.time.localeCompare(b.time)));
    setEditingId(null);
    setFormData({ time: "", title: "", description: "" });
  };

  const handleDelete = (id: string) => {
    onChange(schedule.filter((item) => item.id !== id));
  };

  const startEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setFormData({ time: item.time, title: item.title, description: item.description });
    setShowAddForm(false);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <Card className="bg-muted/30 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Event Schedule (Optional)
          </span>
          {!showAddForm && (
            <Button
              type="button"
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
        {showAddForm && (
          <div className="bg-background p-4 rounded-lg space-y-3 border border-border/50">
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
              <Button type="button" size="sm" onClick={handleAdd}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {schedule.length === 0 && !showAddForm ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No schedule items yet. Add times to help attendees plan their visit.
          </p>
        ) : (
          <div className="space-y-2">
            {schedule.map((item) => (
              <div key={item.id}>
                {editingId === item.id ? (
                  <div className="bg-background p-4 rounded-lg space-y-3 border border-border/50">
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
                      <Button type="button" size="sm" onClick={() => handleUpdate(item.id)}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setFormData({ time: "", title: "", description: "" });
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4 p-3 rounded-lg bg-background/50 group">
                    <div className="text-primary font-medium whitespace-nowrap min-w-[80px]">
                      {formatTime(item.time)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.title}</p>
                      {item.description && <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
