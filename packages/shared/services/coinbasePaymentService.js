/**
 * Coinbase Commerce Payment Service
 * API Integration for Crypto Payments (BTC, ETH, USDC, USDT)
 * API Docs: https://docs.cloud.coinbase.com/commerce/docs
 */

const COINBASE_API_URL = 'https://api.commerce.coinbase.com';

class CoinbasePaymentService {
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_COINBASE_COMMERCE_API_KEY || process.env.COINBASE_COMMERCE_API_KEY;
    this.webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': this.apiKey,
      'X-CC-Version': '2018-03-22'
    };
  }

  /**
   * Create a charge (payment request)
   */
  async createCharge(chargeData) {
    const {
      name,
      description,
      amount,
      currency = 'USD',
      metadata = {},
      redirectUrl,
      cancelUrl
    } = chargeData;

    try {
      const response = await fetch(`${COINBASE_API_URL}/charges`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name,
          description,
          pricing_type: 'fixed_price',
          local_price: {
            amount: amount.toString(),
            currency: currency.toUpperCase()
          },
          metadata,
          redirect_url: redirectUrl,
          cancel_url: cancelUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create charge');
      }

      const result = await response.json();

      return {
        success: true,
        charge: result.data,
        paymentUrl: result.data.hosted_url,
        chargeId: result.data.id,
        chargeCode: result.data.code
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get charge details
   */
  async getCharge(chargeId) {
    try {
      const response = await fetch(`${COINBASE_API_URL}/charges/${chargeId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get charge');
      }

      const result = await response.json();
      return {
        success: true,
        charge: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(payload, signature) {
    try {
      const crypto = await import('crypto');
      const { createHmac } = crypto;
      
      const computedSignature = createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return computedSignature === signature;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle webhook event
   */
  handleWebhookEvent(event) {
    const { type, data } = event;


    switch (type) {
      case 'charge:created':
        return {
          success: true,
          status: 'created',
          charge: data
        };

      case 'charge:confirmed':
        return {
          success: true,
          status: 'confirmed',
          charge: data,
          paid: true
        };

      case 'charge:failed':
        return {
          success: false,
          status: 'failed',
          charge: data
        };

      case 'charge:delayed':
        return {
          success: true,
          status: 'delayed',
          charge: data
        };

      case 'charge:pending':
        return {
          success: true,
          status: 'pending',
          charge: data
        };

      case 'charge:resolved':
        return {
          success: true,
          status: 'resolved',
          charge: data,
          paid: true
        };

      default:
        return {
          success: false,
          status: 'unknown',
          event
        };
    }
  }

  /**
   * Create checkout session (main method)
   */
  async createCheckoutSession(orderData) {
    const {
      planId,
      planName,
      amount,
      currency = 'USD',
      customerEmail,
      userId,
      orderId
    } = orderData;

    // Generate unique order ID if not provided
    const finalOrderId = orderId || `esim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const domain = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const chargeData = {
      name: planName,
      description: `${planName} - eSIM Plan`,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      metadata: {
        orderId: finalOrderId,
        planId,
        userId,
        customerEmail,
        source: 'esim_platform'
      },
      redirectUrl: `${domain}/payment-success?order_id=${finalOrderId}&plan_id=${planId}&email=${customerEmail}&total=${amount}&name=${encodeURIComponent(planName)}&currency=${currency.toLowerCase()}&payment_method=coinbase`,
      cancelUrl: `${domain}/crypto-checkout?cancelled=true`
    };



    return await this.createCharge(chargeData);
  }

  /**
   * Get supported cryptocurrencies
   */
  getSupportedCryptocurrencies() {
    return {
      success: true,
      currencies: [
        { code: 'BTC', name: 'Bitcoin', symbol: '₿', network: 'Bitcoin' },
        { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', network: 'Ethereum' },
        { code: 'USDC', name: 'USD Coin', symbol: '$', network: 'Multiple' },
        { code: 'USDT', name: 'Tether', symbol: '₮', network: 'Multiple' },
        { code: 'DAI', name: 'Dai', symbol: 'DAI', network: 'Ethereum' },
        { code: 'LTC', name: 'Litecoin', symbol: 'Ł', network: 'Litecoin' },
        { code: 'BCH', name: 'Bitcoin Cash', symbol: 'BCH', network: 'Bitcoin Cash' },
        { code: 'DOGE', name: 'Dogecoin', symbol: 'Ð', network: 'Dogecoin' }
      ]
    };
  }
}

// Export singleton instance
export const coinbasePaymentService = new CoinbasePaymentService();

