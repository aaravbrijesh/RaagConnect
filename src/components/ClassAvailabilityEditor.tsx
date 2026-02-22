import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Clock } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

interface ClassAvailabilityEditorProps {
  slots: AvailabilitySlot[];
  onChange: (slots: AvailabilitySlot[]) => void;
}

export default function ClassAvailabilityEditor({ slots, onChange }: ClassAvailabilityEditorProps) {
  const addSlot = () => {
    onChange([...slots, { day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 60 }]);
  };

  const removeSlot = (index: number) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Scheduling Availability
        </CardTitle>
        <p className="text-xs text-muted-foreground">Set your weekly availability so students can book sessions</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {slots.map((slot, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-border/50 bg-muted/30">
            <div className="space-y-1 flex-1 min-w-[120px]">
              <Label className="text-xs">Day</Label>
              <Select value={String(slot.day_of_week)} onValueChange={v => updateSlot(i, 'day_of_week', parseInt(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, idx) => <SelectItem key={idx} value={String(idx)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[100px]">
              <Label className="text-xs">Start</Label>
              <Input type="time" value={slot.start_time} onChange={e => updateSlot(i, 'start_time', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1 min-w-[100px]">
              <Label className="text-xs">End</Label>
              <Input type="time" value={slot.end_time} onChange={e => updateSlot(i, 'end_time', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1 min-w-[90px]">
              <Label className="text-xs">Duration</Label>
              <Select value={String(slot.slot_duration_minutes)} onValueChange={v => updateSlot(i, 'slot_duration_minutes', parseInt(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeSlot(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={addSlot}>
          <Plus className="h-4 w-4" /> Add Time Slot
        </Button>
      </CardContent>
    </Card>
  );
}
