import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [isBot, setIsBot] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const botPattern = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|crawler|spider|robot|crawling/;
    const isCrawler = botPattern.test(ua);
    setIsBot(isCrawler);

    if (isCrawler) {
      setShowBanner(true);
      return;
    }

    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      <div
        role="dialog"
        aria-label="Cookie consent"
        aria-modal="false"
        aria-describedby="cookie-consent-description"
        className="fixed bottom-0 left-0 right-0 z-50"
        style={isBot ? {} : { animation: 'slideUp 0.3s ease-out' }}
      >
        <div className="bg-gray-900 text-white shadow-2xl border-t-4 border-red-600">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">Cookie Preferences</h3>
                <p id="cookie-consent-description" className="text-sm text-gray-300">
                  We use cookies to enhance your browsing experience, serve personalised content, and analyse our traffic.
                  By clicking &quot;Accept All&quot;, you consent to our use of cookies in accordance with our{' '}
                  <Link to="/cookies" className="text-red-400 hover:text-red-300 underline">
                    Cookie Policy
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-red-400 hover:text-red-300 underline">
                    Privacy Policy
                  </Link>.
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={handleDecline}
                  className="px-6 py-2.5 border-2 border-gray-600 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors text-sm"
                  aria-label="Decline optional cookies"
                >
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors text-sm"
                  aria-label="Accept all cookies"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Cookie Consent',
            description: 'This website uses cookies. Users can accept or decline cookies.',
            mainEntity: {
              '@type': 'Action',
              name: 'Cookie Consent Choice',
              description: 'User can accept all cookies or decline optional cookies',
              actionStatus: 'PotentialActionStatus',
            },
          }),
        }}
      />
    </>
  );
}
