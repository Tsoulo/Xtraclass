import fetch from 'node-fetch';

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface WhatsAppTemplateMessage {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: any[];
}

interface WhatsAppTextMessage {
  to: string;
  message: string;
}

export async function sendWhatsAppTextMessage(params: WhatsAppTextMessage): Promise<WhatsAppMessageResponse | null> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('⚠️ WhatsApp credentials not configured. Message not sent.');
    return null;
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: params.to,
          type: 'text',
          text: {
            preview_url: false,
            body: params.message,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ WhatsApp API error:', error);
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    const data = await response.json() as WhatsAppMessageResponse;
    console.log('✅ WhatsApp message sent:', data.messages?.[0]?.id);
    return data;
  } catch (error) {
    console.error('❌ Failed to send WhatsApp message:', error);
    throw error;
  }
}

export async function sendWhatsAppTemplateMessage(params: WhatsAppTemplateMessage): Promise<WhatsAppMessageResponse | null> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('⚠️ WhatsApp credentials not configured. Template message not sent.');
    return null;
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: params.to,
          type: 'template',
          template: {
            name: params.templateName,
            language: {
              code: params.languageCode || 'en',
            },
            components: params.components || [],
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ WhatsApp template API error:', error);
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    const data = await response.json() as WhatsAppMessageResponse;
    console.log('✅ WhatsApp template message sent:', data.messages?.[0]?.id);
    return data;
  } catch (error) {
    console.error('❌ Failed to send WhatsApp template message:', error);
    throw error;
  }
}

export async function sendHomeworkReminder(phoneNumber: string, studentName: string, homeworkTitle: string, dueDate: string): Promise<WhatsAppMessageResponse | null> {
  const message = `📚 Hi! This is a reminder for ${studentName}.\n\nHomework: ${homeworkTitle}\nDue: ${dueDate}\n\nPlease complete it on XtraClass.ai`;
  
  return sendWhatsAppTextMessage({
    to: phoneNumber,
    message,
  });
}

export async function sendAssessmentCompleteNotification(
  phoneNumber: string, 
  studentName: string, 
  assessmentType: string, 
  score: number
): Promise<WhatsAppMessageResponse | null> {
  const message = `🎉 Great news!\n\n${studentName} has completed their ${assessmentType}.\n\nScore: ${score}%\n\nView full results on XtraClass.ai`;
  
  return sendWhatsAppTextMessage({
    to: phoneNumber,
    message,
  });
}

export async function sendWelcomeMessage(phoneNumber: string, name: string, role: string): Promise<WhatsAppMessageResponse | null> {
  const message = `👋 Welcome to XtraClass.ai, ${name}!\n\nYou've been registered as a ${role}. Start exploring your personalized learning experience today!\n\nVisit: https://xtraclass.ai`;
  
  return sendWhatsAppTextMessage({
    to: phoneNumber,
    message,
  });
}

export async function sendParentStudentAddedNotification(
  parentPhone: string,
  parentName: string,
  studentName: string,
  className: string,
  teacherName: string
): Promise<WhatsAppMessageResponse | null> {
  const message = `📣 Hello ${parentName}!\n\n${studentName} has been added to ${className} by ${teacherName}.\n\nTrack their progress on XtraClass.ai`;
  
  return sendWhatsAppTextMessage({
    to: parentPhone,
    message,
  });
}

export async function sendParentSubscriptionRequest(
  parentPhone: string,
  parentName: string,
  studentName: string,
  subscriptionPlan: string,
  amount: string,
  paymentLink?: string
): Promise<WhatsAppMessageResponse | null> {
  const message = `💳 Hello ${parentName}!\n\n${studentName} has requested a premium subscription to XtraClass.ai.\n\nPlan: ${subscriptionPlan}\nAmount: ${amount}\n\n${paymentLink ? `Complete payment here: ${paymentLink}` : 'Please log in to XtraClass.ai to complete the subscription.'}\n\nUnlock full access to personalized learning, AI tutoring, and progress tracking!`;
  
  return sendWhatsAppTextMessage({
    to: parentPhone,
    message,
  });
}

export async function sendSubscriptionConfirmation(
  phoneNumber: string,
  name: string,
  studentName: string,
  subscriptionPlan: string,
  nextPaymentDate: string
): Promise<WhatsAppMessageResponse | null> {
  const message = `✅ Subscription Confirmed!\n\nHello ${name},\n\n${studentName}'s premium subscription is now active.\n\nPlan: ${subscriptionPlan}\nNext payment: ${nextPaymentDate}\n\nThank you for choosing XtraClass.ai!`;
  
  return sendWhatsAppTextMessage({
    to: phoneNumber,
    message,
  });
}

export function isWhatsAppConfigured(): boolean {
  return !!(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID);
}
