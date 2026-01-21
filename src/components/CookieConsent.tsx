import { useState } from 'react';
import { acceptCookies, declineCookies, hasConsentDecision } from '../utils/analytics.ts';

export function CookieConsent() {
  const [visible, setVisible] = useState(!hasConsentDecision());

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 2000,
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      flexWrap: 'wrap',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.3)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', maxWidth: 600 }}>
        This site uses cookies (Google Analytics) to understand how the tool is used. No personal data is collected.
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-accent"
          style={{ padding: '6px 16px', fontSize: 12 }}
          onClick={() => { acceptCookies(); setVisible(false); }}
        >
          Accept
        </button>
        <button
          className="btn"
          style={{ padding: '6px 16px', fontSize: 12 }}
          onClick={() => { declineCookies(); setVisible(false); }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
