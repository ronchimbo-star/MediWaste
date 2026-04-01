import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
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
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="bg-gray-900 text-white shadow-2xl border-t-4 border-orange-600">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">🍪 Cookie Preferences</h3>
              <p className="text-sm text-gray-300">
                We use cookies to enhance your browsing experience and analyze site traffic.
                By clicking "Accept", you consent to our use of cookies.{' '}
                <a href="/privacy-policy" className="text-orange-400 hover:text-orange-300 underline">
                  Learn more
                </a>
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={handleDecline}
                className="px-6 py-2 border-2 border-gray-600 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
