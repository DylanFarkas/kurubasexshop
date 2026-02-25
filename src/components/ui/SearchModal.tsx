import { useState, useEffect, useRef } from 'react';
import { Search, X, Package, Clock } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  final_price?: number;
  image?: string;
  images?: string[];
  categoryLabel?: string;
}

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Cargar búsquedas recientes del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kuruba-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Abrir modal desde el botón del header
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };

    const searchBtn = document.getElementById('search-btn');
    searchBtn?.addEventListener('click', handleOpen);

    // Atajo de teclado Ctrl+K o Cmd+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      searchBtn?.removeEventListener('click', handleOpen);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.products || []);
        }
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleProductClick = (productName: string) => {
    // Guardar en búsquedas recientes
    const updated = [productName, ...recentSearches.filter(s => s !== productName)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('kuruba-recent-searches', JSON.stringify(updated));
    handleClose();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="mt-20 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideDown"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de búsqueda */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-200">
          <Search className="text-neutral-400" size={24} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar productos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-lg outline-none placeholder:text-neutral-400"
          />
          {/* {query && (
            <button
              onClick={() => setQuery('')}
              className="text-neutral-400 hover:text-neutral-600 transition"
              aria-label="Limpiar búsqueda"
            >
              <X size={20} />
            </button>
          )} */}
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
            aria-label="Cerrar búsqueda"
          >
            <X size={24} />
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-center py-12">
              <Package className="text-neutral-300 mx-auto mb-4" size={64} />
              <p className="text-neutral-500">No se encontraron productos</p>
              <p className="text-sm text-neutral-400 mt-1">Intenta con otros términos</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="divide-y divide-neutral-100">
              {results.map((product) => (
                <a
                  key={product.id}
                  href={`/producto/${product.slug}`}
                  onClick={() => handleProductClick(product.name)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-neutral-50 transition group"
                >
                  <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                    <img
                      src={product.image || product.images?.[0] || '/placeholder.png'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-neutral-900 group-hover:text-rose-600 transition truncate">
                      {product.name}
                    </h3>
                    {product.categoryLabel && (
                      <p className="text-sm text-neutral-500">{product.categoryLabel}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {product.final_price && product.final_price < product.price ? (
                      <>
                        <p className="font-bold text-rose-600">{formatPrice(product.final_price)}</p>
                        <p className="text-sm text-neutral-400 line-through">{formatPrice(product.price)}</p>
                      </>
                    ) : (
                      <p className="font-bold text-neutral-900">{formatPrice(product.price)}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Búsquedas recientes */}
          {!query && recentSearches.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                Búsquedas recientes
              </h3>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(search)}
                    className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-50 transition group"
                  >
                    <Clock className="text-neutral-400" size={18} />
                    <span className="text-neutral-700 group-hover:text-neutral-900">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje inicial */}
          {!query && recentSearches.length === 0 && (
            <div className="text-center py-12">
              <Search className="text-neutral-300 mx-auto mb-4" size={64} />
              <p className="text-neutral-500">Busca tus productos favoritos</p>
              <p className="text-sm text-neutral-400 mt-1">Escribe para comenzar</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
