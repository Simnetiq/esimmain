const twilio = require('twilio');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class OTPService {
  // Generate OTP
  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  // Send OTP via SMS
  async sendOTP(phoneNumber, purpose = 'verification') {
    try {
      const otp = this.generateOTP();
      const key = `otp:${phoneNumber}:${purpose}`;

      // Store OTP in Redis with 5 minute expiration
      await redisClient.setEx(key, 300, otp);

      // Send SMS
      const message = await client.messages.create({
        body: `Your eSIM verification code is: ${otp}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      logger.info('OTP sent successfully', { 
        phoneNumber, 
        purpose, 
        messageSid: message.sid 
      });

      return {
        success: true,
        messageSid: message.sid,
        expiresIn: 300
      };
    } catch (error) {
      logger.error('OTP send error', error);
      throw error;
    }
  }

  // Verify OTP
  async verifyOTP(phoneNumber, otp, purpose = 'verification') {
    try {
      const key = `otp:${phoneNumber}:${purpose}`;
      const storedOTP = await redisClient.get(key);

      if (!storedOTP) {
        return {
          success: false,
          error: 'OTP expired or not found'
        };
      }

      if (storedOTP !== otp) {
        // Track failed attempts
        const attemptsKey = `otp:attempts:${phoneNumber}`;
        const attempts = await redisClient.incr(attemptsKey);
        await redisClient.expire(attemptsKey, 3600); // 1 hour

        if (attempts >= 5) {
          logger.warn('Too many OTP attempts', { phoneNumber });
          return {
            success: false,
            error: 'Too many failed attempts. Please try again later.'
          };
        }

        return {
          success: false,
          error: 'Invalid OTP'
        };
      }

      // OTP is valid, delete it
      await redisClient.del(key);
      await redisClient.del(`otp:attempts:${phoneNumber}`);

      logger.info('OTP verified successfully', { phoneNumber, purpose });

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      logger.error('OTP verification error', error);
      throw error;
    }
  }

  // Send OTP via WhatsApp
  async sendWhatsAppOTP(phoneNumber, purpose = 'verification') {
    try {
      const otp = this.generateOTP();
      const key = `otp:${phoneNumber}:${purpose}`;

      // Store OTP in Redis with 5 minute expiration
      await redisClient.setEx(key, 300, otp);

      // Send WhatsApp message
      const message = await client.messages.create({
        body: `Your eSIM verification code is: ${otp}. Valid for 5 minutes.`,
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${phoneNumber}`
      });

      logger.info('WhatsApp OTP sent successfully', { 
        phoneNumber, 
        purpose, 
        messageSid: message.sid 
      });

      return {
        success: true,
        messageSid: message.sid,
        expiresIn: 300
      };
    } catch (error) {
      logger.error('WhatsApp OTP send error', error);
      throw error;
    }
  }

  // Check rate limiting
  async checkRateLimit(phoneNumber) {
    try {
      const key = `otp:ratelimit:${phoneNumber}`;
      const count = await redisClient.incr(key);

      if (count === 1) {
        await redisClient.expire(key, 3600); // 1 hour
      }

      if (count > 3) {
        return {
          allowed: false,
          error: 'Rate limit exceeded. Please try again later.'
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Rate limit check error', error);
      throw error;
    }
  }
}

module.exports = new OTPService();

