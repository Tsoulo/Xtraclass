import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  Share2, 
  MessageCircle, 
  Mail, 
  Users,
  Gift,
  CheckCircle,
  Loader2,
  Phone,
  MessageSquare
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

export default function ReferralShareCard() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: referralData, isLoading } = useQuery<{
    referralCode: string;
    referralLink: string;
  }>({
    queryKey: ['/api/user/referral-code']
  });

  const { data: statsData } = useQuery<{
    totalReferrals: number;
    referrals: { name: string; joinedAt: string }[];
  }>({
    queryKey: ['/api/user/referral-stats']
  });

  const copyToClipboard = async () => {
    if (!referralData?.referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive"
      });
    }
  };

  const copyLinkToClipboard = async () => {
    if (!referralData?.referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralData.referralLink);
      toast({
        title: "Link Copied!",
        description: "Referral link copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive"
      });
    }
  };

  const shareViaWhatsApp = () => {
    if (!referralData?.referralLink) return;
    
    const message = encodeURIComponent(
      `🎓 Join me on XtraClass.ai - the best learning platform for students!\n\n` +
      `Use my referral code: ${referralData.referralCode}\n\n` +
      `Sign up here: ${referralData.referralLink}`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaEmail = () => {
    if (!referralData?.referralLink) return;
    
    const subject = encodeURIComponent("Join me on XtraClass.ai!");
    const body = encodeURIComponent(
      `Hi!\n\n` +
      `I've been using XtraClass.ai for learning and I think you'd love it too!\n\n` +
      `It's an amazing platform for students with AI tutoring, practice exercises, and more.\n\n` +
      `Use my referral code: ${referralData.referralCode}\n\n` +
      `Sign up here: ${referralData.referralLink}\n\n` +
      `Hope to see you there!`
    );
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaSMS = () => {
    if (!referralData?.referralLink) return;
    
    const message = encodeURIComponent(
      `Join me on XtraClass.ai! Use my referral code: ${referralData.referralCode}. Sign up: ${referralData.referralLink}`
    );
    
    // sms: URI scheme works on both iOS and Android
    window.location.href = `sms:?body=${message}`;
  };

  const openPhoneDialer = () => {
    // Opens the phone dialer - user can manually call someone to share
    window.location.href = 'tel:';
  };

  const shareNative = async () => {
    if (!referralData?.referralLink || !navigator.share) return;
    
    try {
      await navigator.share({
        title: 'Join XtraClass.ai',
        text: `Join me on XtraClass.ai! Use my referral code: ${referralData.referralCode}`,
        url: referralData.referralLink
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Share failed",
          description: "Could not share. Try copying the link instead.",
          variant: "destructive"
        });
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          <CardTitle className="text-lg">Invite Friends</CardTitle>
        </div>
        <CardDescription className="text-blue-100">
          Share your referral code and earn rewards when friends join!
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Your Referral Code</label>
          <div className="flex gap-2">
            <Input 
              value={referralData?.referralCode || ''} 
              readOnly 
              className="font-mono text-lg font-bold text-center bg-gray-50"
              data-testid="input-referral-code"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={copyToClipboard}
              data-testid="button-copy-code"
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={shareViaWhatsApp}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            data-testid="button-share-whatsapp"
          >
            <SiWhatsapp className="h-4 w-4" />
            WhatsApp
          </Button>
          
          <Button 
            onClick={shareViaSMS}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            data-testid="button-share-sms"
          >
            <MessageSquare className="h-4 w-4" />
            SMS
          </Button>
          
          <Button 
            onClick={shareViaEmail}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-share-email"
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
          
          <Button 
            onClick={openPhoneDialer}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-share-phone"
          >
            <Phone className="h-4 w-4" />
            Call
          </Button>
        </div>

        <div className="flex gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button 
              onClick={shareNative}
              variant="outline"
              className="flex-1 flex items-center gap-2"
              data-testid="button-share-native"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}
          
          <Button 
            onClick={copyLinkToClipboard}
            variant="outline"
            className="flex-1 flex items-center gap-2"
            data-testid="button-copy-link"
          >
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
        </div>

        {statsData && statsData.totalReferrals > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Your Referrals</span>
              <Badge variant="secondary">{statsData.totalReferrals}</Badge>
            </div>
            <div className="space-y-1">
              {statsData.referrals.slice(0, 5).map((referral, idx) => (
                <div key={idx} className="text-sm text-gray-600 flex justify-between">
                  <span>{referral.name}</span>
                  <span className="text-gray-400">
                    {new Date(referral.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {statsData.totalReferrals > 5 && (
                <div className="text-sm text-gray-400">
                  +{statsData.totalReferrals - 5} more
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
