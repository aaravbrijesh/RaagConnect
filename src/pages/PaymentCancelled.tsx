import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import Nav from '@/components/Nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentCancelled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-4 py-16 max-w-xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Payment cancelled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              You have not been charged. You can go back and try again whenever you're ready.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/events')}>Browse events</Button>
              <Button onClick={() => navigate('/classes')}>Browse classes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
