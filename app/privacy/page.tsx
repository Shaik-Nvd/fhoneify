import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', lineHeight: '1.6', color: 'var(--foreground)' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: 'var(--gold)' }}>Privacy Policy</h1>
      <p style={{ marginBottom: '15px', color: '#ccc' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2 style={{ fontSize: '1.5rem', marginTop: '30px', marginBottom: '15px' }}>1. Information We Collect</h2>
      <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>
        We collect personal information that you provide to us, such as your name, phone number, address, and device details when you use our platform to sell your phone.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '30px', marginBottom: '15px' }}>2. How We Use Your Information</h2>
      <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>
        We use the collected information to:
        <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '10px' }}>
          <li>Provide you with accurate price quotes for your devices.</li>
          <li>Schedule and execute doorstep pickups.</li>
          <li>Communicate with you regarding your selling requests.</li>
          <li>Improve our services and user experience.</li>
        </ul>
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '30px', marginBottom: '15px' }}>3. Data Sharing</h2>
      <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>
        We do not sell your personal data to third parties. We may share necessary information with our trusted field executives solely for the purpose of completing your pickup.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '30px', marginBottom: '15px' }}>4. Security</h2>
      <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>
        We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, or disclosure.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '30px', marginBottom: '15px' }}>5. Contact Us</h2>
      <p style={{ marginBottom: '15px', color: 'var(--muted)' }}>
        If you have any questions or concerns about this Privacy Policy, please contact us at privacy@fhoneify.in.
      </p>
    </div>
  );
}
