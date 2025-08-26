// Simple test API endpoint for Vercel
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Test endpoint called:', req.method, req.url);
    
    if (req.method === 'POST' && req.url === '/api/test/otp') {
      const { email } = req.body || {};
      
      // Simple OTP generation without external dependencies
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log(`Generated OTP for ${email}: ${otp}`);
      
      // For testing - just return success
      return res.status(200).json({ 
        message: "Test OTP generated successfully",
        email: email,
        otp: otp // Remove this in production
      });
    }
    
    return res.status(200).json({ 
      message: "Test API working", 
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({ 
      error: "Test API failed", 
      details: String(error) 
    });
  }
}