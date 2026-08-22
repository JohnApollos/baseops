import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Zap } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Plans</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details.</p>
      </div>

      {/* Current Plan Indicator */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Current Plan</p>
          <p className="text-xl font-bold">Free Tier</p>
        </div>
        <Badge variant="outline" className="border-primary text-primary bg-primary/10">Active</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Free Plan */}
        <Card className="border-border/50 relative">
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Perfect for small fleets getting started.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold">KES 0<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Up to 3 drivers</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Up to 100 parcels/month</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Basic offline sync</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Community support</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>Current Plan</Button>
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className="border-primary shadow-lg shadow-primary/10 relative overflow-hidden">
          {/* Badge */}
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
            <Zap className="h-3 w-3" /> Recommended
          </div>

          <CardHeader>
            <CardTitle className="text-primary">Pro</CardTitle>
            <CardDescription>For growing logistics companies.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold">KES 5,000<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited drivers</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited parcels</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Real-time location tracking</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Priority email support</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Advanced Recharts analytics</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Upgrade to Pro</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
