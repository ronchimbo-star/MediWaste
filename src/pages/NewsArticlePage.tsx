import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Share2, Facebook, Twitter, Linkedin, Mail, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BottomCTA from '../components/BottomCTA';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/dateFormat';

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  featured_image_alt?: string;
  featured_image_caption?: string;
  published_at: string;
  updated_at?: string;
  tags?: string[];
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  cta_enabled?: boolean;
  cta_title?: string;
  cta_description?: string;
}

interface NewsAdvert {
  id: string;
  title: string;
  description: string;
  link_text: string;
  link_url: string;
  background_color?: string;
  position?: number;
}

export default function NewsArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [adverts, setAdverts] = useState<NewsAdvert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchArticle();
      fetchAdverts();
    }
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError('Article not found');
        return;
      }
      setArticle(data);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdverts = async () => {
    try {
      const { data } = await supabase
        .from('news_adverts')
        .select('*')
        .eq('status', 'active')
        .order('position', { ascending: true })
        .limit(2);

      if (data) {
        setAdverts(data);
      }
    } catch (err) {
      console.error('Error fetching adverts:', err);
    }
  };

  const splitContent = (content: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const elements = Array.from(tempDiv.children);

    if (elements.length === 0) {
      return {
        part1: content,
        part2: '',
        part3: '',
      };
    }

    const totalElements = elements.length;
    const firstThird = Math.floor(totalElements / 3);
    const secondThird = Math.floor((totalElements * 2) / 3);

    return {
      part1: elements.slice(0, firstThird).map(el => el.outerHTML).join(''),
      part2: elements.slice(firstThird, secondThird).map(el => el.outerHTML).join(''),
      part3: elements.slice(secondThird).map(el => el.outerHTML).join(''),
    };
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = article?.title || '';

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="mt-4 text-gray-600">Loading article...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <p className="text-gray-600 mb-8">The article you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/news"
            className="inline-flex items-center text-red-600 hover:text-red-700 font-semibold"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to News
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const contentParts = splitContent(article.content);
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    image: {
      '@type': 'ImageObject',
      url: article.og_image || article.featured_image,
      width: 1200,
      height: 630,
    },
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://mediwaste.co.uk/news/${article.slug}`,
    },
    author: {
      '@type': 'Organization',
      name: 'MediWaste',
      url: 'https://mediwaste.co.uk',
    },
    publisher: {
      '@type': 'Organization',
      name: 'MediWaste',
      url: 'https://mediwaste.co.uk',
      logo: {
        '@type': 'ImageObject',
        url: 'https://mediwaste.co.uk/mediwaste-logo.png',
        width: 200,
        height: 60,
      },
    },
    keywords: article.seo_keywords?.join(', ') || '',
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={article.seo_title || article.title}
        description={article.seo_description || article.excerpt}
        canonical={`https://mediwaste.co.uk/news/${article.slug}`}
        keywords={article.seo_keywords?.join(', ') || ''}
        ogImage={article.og_image || article.featured_image}
        schema={articleSchema}
        type="article"
      />
      <Header />

      <article className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Link
              to="/news"
              className="inline-flex items-center text-red-600 hover:text-red-700 font-semibold mb-8 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to News
            </Link>

            <div className="mb-8">
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={article.published_at}>
                    {formatDate(article.published_at)}
                  </time>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
                    aria-label="Share article"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>

                  {showShareMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 min-w-[200px]">
                      <div className="flex flex-col gap-2">
                        <a
                          href={shareLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
                        >
                          <Facebook className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium">Facebook</span>
                        </a>
                        <a
                          href={shareLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
                        >
                          <Twitter className="w-5 h-5 text-sky-500" />
                          <span className="text-sm font-medium">Twitter</span>
                        </a>
                        <a
                          href={shareLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
                        >
                          <Linkedin className="w-5 h-5 text-blue-700" />
                          <span className="text-sm font-medium">LinkedIn</span>
                        </a>
                        <a
                          href={shareLinks.email}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
                        >
                          <Mail className="w-5 h-5 text-gray-600" />
                          <span className="text-sm font-medium">Email</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {article.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-full font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
              {article.title}
            </h1>

            <div className="mb-12">
              <img
                src={article.featured_image}
                alt={article.featured_image_alt || article.title}
                className="w-full rounded-lg shadow-md"
                fetchPriority="high"
                decoding="async"
              />
              {article.featured_image_caption && (
                <p className="text-sm text-gray-600 mt-3 text-center italic">
                  {article.featured_image_caption}
                </p>
              )}
            </div>

            <div className="article-content">
              <div dangerouslySetInnerHTML={{ __html: contentParts.part1 }} />
            </div>

            {adverts[0] && (
              <div
                className="my-12 p-8 rounded-lg shadow-sm border border-gray-200"
                style={{ backgroundColor: adverts[0].background_color || '#f9fafb' }}
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{adverts[0].title}</h3>
                <p className="text-gray-700 mb-4">{adverts[0].description}</p>
                <Link
                  to={adverts[0].link_url}
                  className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold transition-colors"
                >
                  {adverts[0].link_text}
                </Link>
              </div>
            )}

            <div className="article-content">
              <div dangerouslySetInnerHTML={{ __html: contentParts.part2 }} />
            </div>

            {adverts[1] && (
              <div
                className="my-12 p-8 rounded-lg shadow-sm border border-gray-200"
                style={{ backgroundColor: adverts[1].background_color || '#f9fafb' }}
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{adverts[1].title}</h3>
                <p className="text-gray-700 mb-4">{adverts[1].description}</p>
                <Link
                  to={adverts[1].link_url}
                  className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold transition-colors"
                >
                  {adverts[1].link_text}
                </Link>
              </div>
            )}

            <div className="article-content">
              <div dangerouslySetInnerHTML={{ __html: contentParts.part3 }} />
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <Link
                to="/news"
                className="inline-flex items-center text-red-600 hover:text-red-700 font-semibold transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to all articles
              </Link>
            </div>
          </div>
        </div>
      </article>

      {article.cta_enabled !== false && (
        <BottomCTA
          title={article.cta_title || "Get a Free Quote Today"}
          description={article.cta_description || "Professional clinical waste disposal services tailored to your needs. Contact us for a no-obligation quote."}
        />
      )}

      <Footer />
    </div>
  );
}
