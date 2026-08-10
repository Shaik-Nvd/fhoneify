import React from 'react';

export default function TermsAndConditions() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', lineHeight: '1.6', color: 'var(--foreground)' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: 'var(--gold)' }}>Terms and Conditions</h1>
      <p style={{ marginBottom: '15px', color: '#ccc' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2 style={{ fontSize: '1.5rem', marginTop: '30px', marginBottom: '15px' }}>1. Agreement to Terms</h2>
      <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>
        By accessing or using Fhoneify, you agree to be bound by these Terms and Conditions. If you disagree with any part of the terms, you may not access the service.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '30px', marginBottom: '15px' }}>2. Device Valuation and Sale</h2>
      <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>
        The prices quoted on our platform are estimated based on the condition described by you. The final price is subject to physical verification of the device at the time of pickup. We reserve the right to revise or withdraw the offer if the actual condition differs from the stated condition.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '30px', marginBottom: '15px' }}>3. Data Privacy</h2>
      <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>
        It is your sole responsibility to back up and erase all personal data from your device before handing it over. Fhoneify is not responsible for any loss of data.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '30px', marginBottom: '15px' }}>4. Payment</h2>
      <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>
        Payments are processed instantly upon successful verification of the device at your doorstep. We support multiple payment methods including UPI and Bank Transfer.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '30px', marginBottom: '15px' }}>5. Contact Us</h2>
      <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>
        If you have any questions about these Terms, please contact us at support@fhoneify.in.
      </p>
    </div>
  );
}
