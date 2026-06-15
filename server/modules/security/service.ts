export const SecurityService = {
  // Simulate fetching wiping certificates for a user
  async getUserCertificates(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock data for the user
    return [
      {
        id: 'CERT-88192A',
        deviceId: 'dev-1',
        deviceModel: 'Apple iPhone 13 Pro',
        imei: '358910001234567',
        status: 'securely_erased',
        wipedAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
        method: 'DoD 5220.22-M (3 Pass)',
        technician: 'Fhoneify SecOps'
      },
      {
        id: 'CERT-99201B',
        deviceId: 'dev-2',
        deviceModel: 'Samsung Galaxy S22 Ultra',
        imei: '990000111222333',
        status: 'pending_wipe',
        wipedAt: null,
        method: null,
        technician: null
      }
    ];
  },

  // Simulate generating a downloadable certificate
  async generateCertificate(certId: string, userId: string) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real app, this would generate a PDF buffer using something like pdfkit or puppeteer.
    // Here we'll just return raw HTML representing the certificate for the demo.
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Certificate of Data Destruction</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          .cert-container { border: 10px solid #d4af37; padding: 40px; text-align: center; max-width: 800px; margin: 0 auto; background: #fff; }
          .title { font-size: 36px; color: #0a0a0a; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
          .subtitle { font-size: 18px; color: #666; margin-bottom: 40px; }
          .content { font-size: 16px; line-height: 1.6; text-align: left; margin: 0 auto; max-width: 600px; }
          .highlight { font-weight: bold; color: #0a0a0a; }
          .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 14px; color: #888; display: flex; justify-content: space-between; }
          .badge { display: inline-block; padding: 10px 20px; background: #d4af37; color: #fff; font-weight: bold; border-radius: 4px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="cert-container">
          <h1 class="title">Certificate of Data Destruction</h1>
          <p class="subtitle">Official Verification by Fhoneify Security</p>
          
          <div class="content">
            <p>This document certifies that the device described below has been subjected to a certified data erasure process, ensuring all user data, applications, and settings have been permanently and irreversibly destroyed.</p>
            
            <p><strong>Certificate ID:</strong> ${certId}</p>
            <p><strong>Date of Erasure:</strong> ${new Date().toLocaleDateString()}</p>
            
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Device Model:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">Apple iPhone 13 Pro</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>IMEI / Serial:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">358910001234567</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Erasure Standard:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">DoD 5220.22-M (3 Pass Wipe)</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Verification:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">100% Sectors Verified</td></tr>
            </table>
            
            <div style="text-align: center; margin-top: 30px;">
              <span class="badge">SECURELY ERASED</span>
            </div>
          </div>
          
          <div class="footer">
            <div>Authorized Signature: <br><br><em>Fhoneify SecOps Team</em></div>
            <div>Verification ID: <br><br><strong>${Math.random().toString(36).substring(2, 10).toUpperCase()}</strong></div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
};
