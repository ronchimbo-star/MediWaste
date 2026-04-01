import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const ARTICLES_PER_PAGE = 12;

export default function NewsCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);

  useEffect(() => {
    if (categorySlug) {
      fetchCategory();
    }
  }, [categorySlug]);

  useEffect(() => {
    if (category) {
      fetchArticles();
    }
  }, [currentPage, category]);

  const fetchCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('news_categories')
        .select('*')
        .eq('slug', categorySlug)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        navigate('/news');
        return;
      }

      setCategory(data);
    } catch (err) {
      console.error('Error fetching category:', err);
      navigate('/news');
    }
  };

  const fetchArticles = async () => {
    if (!category) return;

    try {
      setLoading(true);

      const from = (currentPage - 1) * ARTICLES_PER_PAGE;
      const to = from + ARTICLES_PER_PAGE - 1;

      const { data: articleIds, error: junctionError } = await supabase
        .from('news_article_categories')
        .select('article_id')
        .eq('category_id', category.id);

      if (junctionError) throw junctionError;

      const ids = articleIds?.map(item => item.article_id) || [];

      if (ids.length === 0) {
        setArticles([]);
        setTotalArticles(0);
        setLoading(false);
        return;
      }

      const { data, error, count } = await supabase
        .from('news_articles')
        .select('id, title, slug, excerpt, featured_image, published_at, created_at', { count: 'exact' })
        .in('id', ids)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setArticles(data || []);
      setTotalArticles(count || 0);
    } catch (err) {
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && !category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <nav className="bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4">
          <Link
            to="/news"
            className="text-orange-600 hover:text-orange-700 font-medium inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All News
          </Link>
        </div>
      </nav>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <div className="inline-block px-4 py-2 bg-orange-100 text-orange-700 text-sm font-medium rounded-full mb-4">
                Category
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-xl text-gray-600">
                  {category.description}
                </p>
              )}
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                    <div className="aspect-video bg-gray-200"></div>
                    <div className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-600 mb-4">No articles found in this category yet.</p>
                <Link
                  to="/news"
                  className="inline-block text-orange-600 hover:text-orange-700 font-semibold"
                >
                  Browse All News
                </Link>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {articles.map((article) => (
                    <article key={article.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      <Link to={`/news/${article.slug}`} className="block group">
                        {article.featured_image && (
                          <div className="aspect-video w-full overflow-hidden bg-gray-100">
                            <img
                              src={article.featured_image}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          <time className="text-sm text-orange-600 font-medium">
                            {formatDate(article.published_at || article.created_at)}
                          </time>
                          <h2 className="text-xl font-bold text-gray-900 mt-2 mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
                            {article.title}
                          </h2>
                          {article.excerpt && (
                            <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                              {article.excerpt}
                            </p>
                          )}
                          <span className="text-orange-600 font-semibold text-sm inline-flex items-center">
                            Read More
                            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-12 flex justify-center items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>

                    <div className="flex gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            currentPage === page
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
