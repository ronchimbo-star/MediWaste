import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from '../utils/dateFormat';
import SEO from '../components/SEO';

export default function TermsPage() {
  const [content, setContent] = useState<string>('');
  const [lastReviewDate, setLastReviewDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('terms_of_service, copyright_last_review_date')
          .eq('id', 'default')
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setContent(data.terms_of_service || '');
          setLastReviewDate(data.copyright_last_review_date || '');
        }
      } catch (error) {
        console.error('Error loading terms:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Terms of Service | MediWaste"
        description="Terms and conditions for using MediWaste clinical waste disposal services. Read our service agreements and policies."
        canonical="https://mediwaste.co.uk/terms"
        noindex={true}
      />
      <div className="bg-red-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <nav className="text-sm mb-4">
              <Link to="/" className="hover:underline">Home</Link>
              <span className="mx-2">/</span>
              <span>Terms of Service</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
            {lastReviewDate && (
              <p className="text-red-100">
                Last reviewed: {format(new Date(lastReviewDate), 'dd MMMM yyyy')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ) : (
              <div
                className="prose prose-lg max-w-none
                  prose-headings:text-gray-900 prose-headings:font-bold
                  prose-h1:text-4xl prose-h1:mb-6 prose-h1:pb-4 prose-h1:border-b prose-h1:border-gray-200
                  prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                  prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                  prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                  prose-ul:my-4 prose-ul:space-y-2
                  prose-li:text-gray-700 prose-li:leading-relaxed
                  prose-strong:text-gray-900 prose-strong:font-semibold
                  prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline
                  prose-table:my-6
                  prose-thead:bg-gray-50
                  prose-th:p-3 prose-th:text-left prose-th:font-semibold prose-th:text-gray-900
                  prose-td:p-3 prose-td:border-t prose-td:border-gray-200
                  [&_.lead]:text-xl [&_.lead]:text-gray-600 [&_.lead]:mb-8 [&_.lead]:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            )}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/contact"
              className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Have Questions? Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
