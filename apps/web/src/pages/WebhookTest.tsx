import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function WebhookTest() {
  const [userId, setUserId] = useState('');
  const [isRenewal, setIsRenewal] = useState('true');
  const { toast } = useToast();

  const testWebhookMutation = useMutation({
    mutationFn: async (data: { userId: string; isRenewal: boolean }) => {
      return await apiRequest('/api/subscription/webhook-test', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Webhook Test Successful',
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to test webhook',
        variant: 'destructive'
      });
    }
  });

  const handleTest = () => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'Please enter a user ID',
        variant: 'destructive'
      });
      return;
    }

    testWebhookMutation.mutate({
      userId: userId,
      isRenewal: isRenewal === 'true'
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Webhook Test Tool</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Paystack Webhook</CardTitle>
          <CardDescription>
            Simulate a charge.success webhook event to test subscription renewal logic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              data-testid="input-user-id"
              placeholder="Enter user ID to test"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Enter the ID of a user who has an active subscription
            </p>
          </div>

          <div className="space-y-2">
            <Label>Webhook Type</Label>
            <RadioGroup value={isRenewal} onValueChange={setIsRenewal}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="renewal" data-testid="radio-renewal" />
                <Label htmlFor="renewal" className="font-normal cursor-pointer">
                  Renewal Charge (uses subscription_code)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="initial" data-testid="radio-initial" />
                <Label htmlFor="initial" className="font-normal cursor-pointer">
                  Initial Charge (uses metadata)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-sm text-muted-foreground">
              Renewal simulates recurring payment (Paystack sends subscription_code but no metadata)
            </p>
          </div>

          <Button
            data-testid="button-test-webhook"
            onClick={handleTest}
            disabled={testWebhookMutation.isPending}
            className="w-full"
          >
            {testWebhookMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Test Webhook
          </Button>

          {testWebhookMutation.data && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold mb-2 text-green-900 dark:text-green-100">
                Test Result: {testWebhookMutation.data.message}
              </h3>
              <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                <p><strong>Status:</strong> {testWebhookMutation.data.subscription?.status}</p>
                <p>
                  <strong>Current Period Start:</strong>{' '}
                  {testWebhookMutation.data.subscription?.currentPeriodStart
                    ? new Date(testWebhookMutation.data.subscription.currentPeriodStart).toLocaleString()
                    : 'N/A'}
                </p>
                <p>
                  <strong>Current Period End:</strong>{' '}
                  {testWebhookMutation.data.subscription?.currentPeriodEnd
                    ? new Date(testWebhookMutation.data.subscription.currentPeriodEnd).toLocaleString()
                    : 'N/A'}
                </p>
                <p>
                  <strong>Next Payment Date:</strong>{' '}
                  {testWebhookMutation.data.subscription?.nextPaymentDate
                    ? new Date(testWebhookMutation.data.subscription.nextPaymentDate).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Enter a user ID who has an existing subscription</li>
              <li>Choose webhook type (renewal simulates real Paystack behavior)</li>
              <li>Click "Test Webhook" to simulate the charge.success event</li>
              <li>The subscription dates will be extended by 1 month from today</li>
              <li>Check the results to verify the webhook logic works correctly</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
