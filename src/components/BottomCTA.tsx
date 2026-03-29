import { Link } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';

interface BottomCTAProps {
  title: string;
  description: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  showPhoneButton?: boolean;
  className?: string;
}

export default function BottomCTA({
  title,
  description,
  primaryButtonText = 'Request a Quote',
  primaryButtonLink = '/quote',
  showPhoneButton = true,
  className = ''
}: BottomCTAProps) {
  return (
    <section className={`py-20 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-red-600 rounded-3xl p-12 md:p-16 text-white text-center shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
            {title}
          </h2>
          <p className="text-lg md:text-xl mb-10 opacity-95 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={primaryButtonLink}
              className="bg-white text-red-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 hover:shadow-xl transition-all inline-flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              {primaryButtonText}
              <ArrowRight className="w-5 h-5" />
            </Link>
            {showPhoneButton && (
              <a
                href="tel:+441234567890"
                className="bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-all inline-flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Call Us Now
              </a>
            )}
          </div>
          <p className="mt-6 text-sm text-white/80">
            Free consultation • Tailored solutions • No obligation
          </p>
        </div>
      </div>
    </section>
  );
}
