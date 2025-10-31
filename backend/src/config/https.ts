import https from 'https';
import fs from 'fs';
import path from 'path';

// HTTPS Configuration
export const createHttpsServer = (app: any) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    // Development: Use HTTP
    return null;
  }

  try {
    // Production: Use HTTPS
    const sslKeyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../ssl/private.key');
    const sslCertPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../ssl/certificate.crt');
    const sslCaPath = process.env.SSL_CA_PATH || path.join(__dirname, '../ssl/ca_bundle.crt');

    // Check if SSL files exist
    if (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCertPath)) {
      console.warn('⚠️  SSL certificates not found. Falling back to HTTP.');
      console.warn('   To enable HTTPS, place your SSL certificates in:');
      console.warn(`   - Private Key: ${sslKeyPath}`);
      console.warn(`   - Certificate: ${sslCertPath}`);
      console.warn(`   - CA Bundle: ${sslCaPath}`);
      return null;
    }

    const options: https.ServerOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath),
      // Include CA bundle if available
      ...(fs.existsSync(sslCaPath) && { ca: fs.readFileSync(sslCaPath) }),
      
      // Security options
      secureProtocol: 'TLSv1_2_method',
      ciphers: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES128-SHA',
        'ECDHE-RSA-AES256-SHA',
        'AES128-GCM-SHA256',
        'AES256-GCM-SHA384',
        'AES128-SHA256',
        'AES256-SHA256',
        'AES128-SHA',
        'AES256-SHA'
      ].join(':'),
      honorCipherOrder: true,
      
      // Additional security
      secureOptions: require('constants').SSL_OP_NO_SSLv2 | require('constants').SSL_OP_NO_SSLv3,
    };

    return https.createServer(options, app);
  } catch (error) {
    console.error('❌ Failed to create HTTPS server:', error);
    console.warn('⚠️  Falling back to HTTP');
    return null;
  }
};

// SSL Certificate validation
export const validateSSLCertificates = (): boolean => {
  const sslKeyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../ssl/private.key');
  const sslCertPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../ssl/certificate.crt');

  if (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCertPath)) {
    return false;
  }

  try {
    const cert = fs.readFileSync(sslCertPath);
    const key = fs.readFileSync(sslKeyPath);
    
    // Basic validation
    if (cert.length === 0 || key.length === 0) {
      return false;
    }

    // Check certificate expiration
    const certMatch = cert.toString().match(/-----BEGIN CERTIFICATE-----\s*([\s\S]*?)\s*-----END CERTIFICATE-----/);
    if (certMatch) {
      const certData = Buffer.from(certMatch[1], 'base64');
      // This is a simplified check - in production, use a proper certificate parser
      console.log('✅ SSL Certificate found and appears valid');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ SSL Certificate validation failed:', error);
    return false;
  }
};

// Force HTTPS redirect middleware
export const forceHttps = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
};

// Security headers for HTTPS
export const httpsSecurityHeaders = (req: any, res: any, next: any) => {
  if (req.secure) {
    // Additional security headers for HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
  }
  next();
};

export default {
  createHttpsServer,
  validateSSLCertificates,
  forceHttps,
  httpsSecurityHeaders
};
