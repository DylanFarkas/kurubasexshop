import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface Category {
  label: string;
  slug: string;
}

interface NavItem {
  label: string;
  href: string;
  type: 'route' | 'anchor' | 'dropdown';
}

interface Props {
  navItems: readonly NavItem[];
  categories: readonly Category[];
  currentPath: string;
}

export default function MobileMenu({ navItems, categories, currentPath }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const isHome = currentPath === '/';

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    setCategoriesOpen(false);
  };

  const closeMenu = () => {
    setIsOpen(false);
    setCategoriesOpen(false);
  };

  return (
    <>
      <button
        onClick={toggleMenu}
        className="lg:hidden fixed left-4 z-60 p-2 text-gray-900 hover:text-pink-500  transition-all duration-300 cursor-pointer"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      <div
        className={`lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-55 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      />

      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-70 bg-white dark:bg-gray-900 z-56 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex flex-col h-full pt-16 pb-6 px-6 overflow-y-auto">
          {navItems.map((item) => {
            if (item.type === 'dropdown') {
              return (
                <div key={item.label} className="border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setCategoriesOpen(!categoriesOpen)}
                    className="w-full flex items-center justify-between py-4 text-left text-gray-900 dark:text-white font-medium uppercase tracking-wide text-sm hover:opacity-70 transition-opacity"
                  >
                    {item.label}
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        categoriesOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Categories Submenu */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      categoriesOpen ? 'max-h-96 mb-2' : 'max-h-0'
                    }`}
                  >
                    <div className="pl-4 space-y-1">
                      {categories.map((category) => (
                        <a
                          key={category.slug}
                          href={`/categoria/${category.slug}`}
                          onClick={closeMenu}
                          className="block py-2 text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors text-sm"
                        >
                          {category.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            const href = item.type === 'anchor' && isHome 
              ? item.href.replace('/', '') 
              : item.href;

            return (
              <a
                key={item.label}
                href={href}
                onClick={closeMenu}
                className="py-4 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium uppercase tracking-wide text-sm hover:opacity-70 transition-opacity"
              >
                {item.label}
              </a>
            );
          })}

          <div className="mt-auto pt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            <p>Kuruba Sexshop</p>
            <p className="mt-1">© 2026</p>
          </div>
        </nav>
      </aside>
    </>
  );
}