import axios from 'axios';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

interface CreateSubscriptionParams {
  customer: string; // email or customer code
  plan: string; // plan code
  authorization?: string; // authorization code
  start_date?: string; // ISO 8601 format
}

interface SubscriptionData {
  customer: number;
  plan: number;
  integration: number;
  domain: string;
  start: number;
  status: string;
  quantity: number;
  amount: number;
  subscription_code: string;
  email_token: string;
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string;
  };
  id: number;
  createdAt: string;
  updatedAt: string;
}

export class PaystackService {
  private headers = {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  /**
   * Create a new subscription for a customer
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<PaystackResponse<SubscriptionData>> {
    try {
      const response = await axios.post<PaystackResponse<SubscriptionData>>(
        `${PAYSTACK_BASE_URL}/subscription`,
        params,
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Paystack createSubscription error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create subscription');
    }
  }

  /**
   * Get subscription details by ID or code
   */
  async getSubscription(idOrCode: string): Promise<PaystackResponse<SubscriptionData>> {
    try {
      const response = await axios.get<PaystackResponse<SubscriptionData>>(
        `${PAYSTACK_BASE_URL}/subscription/${idOrCode}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Paystack getSubscription error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch subscription');
    }
  }

  /**
   * Disable/cancel a subscription
   */
  async disableSubscription(code: string, token: string): Promise<PaystackResponse> {
    try {
      const response = await axios.post<PaystackResponse>(
        `${PAYSTACK_BASE_URL}/subscription/disable`,
        { code, token },
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Paystack disableSubscription error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to disable subscription');
    }
  }

  /**
   * Enable a subscription
   */
  async enableSubscription(code: string, token: string): Promise<PaystackResponse> {
    try {
      const response = await axios.post<PaystackResponse>(
        `${PAYSTACK_BASE_URL}/subscription/enable`,
        { code, token },
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Paystack enableSubscription error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to enable subscription');
    }
  }

  /**
   * Initialize a transaction (for first-time card authorization)
   */
  async initializeTransaction(params: {
    email: string;
    amount: number;
    currency?: string;
    reference?: string;
    callback_url?: string;
    metadata?: any;
    plan?: string;
  }): Promise<PaystackResponse<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>> {
    try {
      const requestBody: any = {
        email: params.email,
        amount: params.amount, // in cents/kobo
        reference: params.reference,
        callback_url: params.callback_url || `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/subscription/callback`,
        metadata: params.metadata,
      };

      // Only include currency if no plan is specified (plan has its own currency)
      if (params.plan) {
        requestBody.plan = params.plan;
      } else if (params.currency) {
        requestBody.currency = params.currency;
      }

      const response = await axios.post<PaystackResponse<{
        authorization_url: string;
        access_code: string;
        reference: string;
      }>>(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        requestBody,
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Paystack initializeTransaction error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize transaction');
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<PaystackResponse<{
    status: string;
    reference: string;
    amount: number;
    customer: {
      email: string;
      customer_code: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      card_type: string;
      bank: string;
      brand: string;
    };
  }>> {
    try {
      const response = await axios.get<PaystackResponse<any>>(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Paystack verifyTransaction error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify transaction');
    }
  }

  /**
   * Create a plan on Paystack
   */
  async createPlan(name: string, amount: number, interval: 'daily' | 'weekly' | 'monthly' | 'annually'): Promise<PaystackResponse<{
    name: string;
    amount: number;
    interval: string;
    plan_code: string;
  }>> {
    try {
      const response = await axios.post<PaystackResponse<any>>(
        `${PAYSTACK_BASE_URL}/plan`,
        { name, amount, interval },
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Paystack createPlan error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create plan');
    }
  }

  /**
   * List all plans
   */
  async listPlans(): Promise<PaystackResponse<Array<{
    id: number;
    name: string;
    plan_code: string;
    amount: number;
    interval: string;
    currency: string;
  }>>> {
    try {
      const response = await axios.get<PaystackResponse<any>>(
        `${PAYSTACK_BASE_URL}/plan`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Paystack listPlans error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to list plans');
    }
  }

  /**
   * List all subscriptions
   */
  async listSubscriptions(params?: {
    perPage?: number;
    page?: number;
    customer?: number;
    plan?: number;
  }): Promise<PaystackResponse<Array<{
    id: number;
    customer: {
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
    };
    plan: {
      name: string;
      plan_code: string;
      amount: number;
      interval: string;
    };
    subscription_code: string;
    email_token: string;
    status: string;
    amount: number;
    next_payment_date: string;
    createdAt: string;
  }>>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.perPage) queryParams.append('perPage', params.perPage.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.customer) queryParams.append('customer', params.customer.toString());
      if (params?.plan) queryParams.append('plan', params.plan.toString());

      const url = `${PAYSTACK_BASE_URL}/subscription${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await axios.get<PaystackResponse<any>>(
        url,
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Paystack listSubscriptions error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to list subscriptions');
    }
  }

  /**
   * Get subscription management link for updating card details
   */
  async getSubscriptionManagementLink(subscriptionCode: string): Promise<PaystackResponse<{ link: string }>> {
    try {
      const response = await axios.get<PaystackResponse<{ link: string }>>(
        `${PAYSTACK_BASE_URL}/subscription/${subscriptionCode}/manage/link`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Paystack getSubscriptionManagementLink error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get subscription management link');
    }
  }
}

export const paystackService = new PaystackService();
