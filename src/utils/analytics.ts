/**
 * Google Analytics 4 event tracking.
 * Only fires if user has accepted cookie consent.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    vdlLoadGA?: () => void;
  }
}

export function trackEvent(action: string, category: string, label?: string): void {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
    });
  }
}

export function acceptCookies(): void {
  localStorage.setItem('vdl-cookie-consent', 'accepted');
  window.vdlLoadGA?.();
}

export function declineCookies(): void {
  localStorage.setItem('vdl-cookie-consent', 'declined');
}

export function hasConsentDecision(): boolean {
  const v = localStorage.getItem('vdl-cookie-consent');
  return v === 'accepted' || v === 'declined';
}
