import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus, X, Tag } from 'lucide-react';

export interface PriceTier {
  id: string;
  name: string;
  price: string;
  quantity: string;
  startDate?: string;
  endDate?: string;
}

interface PriceTiersEditorProps {
  tiers: PriceTier[];
  onChange: (tiers: PriceTier[]) => void;
}

const defaultTierTemplates = [
  { name: 'Early Bird', priceMultiplier: 0.8 },
  { name: 'Regular', priceMultiplier: 1.0 },
  { name: 'Late/At-Door', priceMultiplier: 1.2 },
];

export default function PriceTiersEditor({ tiers, onChange }: PriceTiersEditorProps) {
  const [expanded, setExpanded] = useState(tiers.length > 0);

  const addTier = () => {
    const newTier: PriceTier = {
      id: crypto.randomUUID(),
      name: '',
      price: '',
      quantity: '',
      startDate: '',
      endDate: ''
    };
    onChange([...tiers, newTier]);
    setExpanded(true);
  };

  const removeTier = (id: string) => {
    onChange(tiers.filter(t => t.id !== id));
  };

  const updateTier = (id: string, field: keyof PriceTier, value: string) => {
    onChange(tiers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addQuickTiers = (basePrice: string) => {
    const price = parseFloat(basePrice) || 0;
    const newTiers: PriceTier[] = defaultTierTemplates.map(template => ({
      id: crypto.randomUUID(),
      name: template.name,
      price: (price * template.priceMultiplier).toFixed(2),
      quantity: '',
      startDate: '',
      endDate: ''
    }));
    onChange(newTiers);
    setExpanded(true);
  };

  if (!expanded && tiers.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Price Tiers</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpanded(true)}
            className="gap-2"
          >
            <Tag className="h-4 w-4" />
            Add Price Tiers
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Optional: Create early bird, regular, and late pricing tiers
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Price Tiers</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTier}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Tier
        </Button>
      </div>

      {tiers.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No tiers added yet. Add individual tiers or use the quick-add option below.
        </p>
      )}

      <div className="space-y-3">
        {tiers.map((tier, index) => (
          <Card key={tier.id} className="p-4 relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => removeTier(tier.id)}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
              <div className="space-y-1">
                <Label className="text-xs">Tier Name</Label>
                <Input
                  placeholder="e.g. Early Bird"
                  value={tier.name}
                  onChange={(e) => updateTier(tier.id, 'name', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={tier.price}
                  onChange={(e) => updateTier(tier.id, 'price', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Quantity Available</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={tier.quantity}
                  onChange={(e) => updateTier(tier.id, 'quantity', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Valid Until (Optional)</Label>
                <Input
                  type="date"
                  value={tier.endDate || ''}
                  onChange={(e) => updateTier(tier.id, 'endDate', e.target.value)}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {tiers.length === 0 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => addQuickTiers('100')}
          className="w-full"
        >
          Quick Add: Early Bird / Regular / Late Tiers
        </Button>
      )}

      {tiers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tiers will be shown to attendees in order. Leave quantity empty for unlimited.
        </p>
      )}
    </div>
  );
}
