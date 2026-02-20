import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCartStore } from '../../stores/cartStore';
import CartDrawer from './CartDrawer';

export default function CartButton() {
  const [isOpen, setIsOpen] = useState(false);
  const itemCount = useCartStore(state => state.getItemCount());

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-1 opacity-70 transition hover:opacity-100 cursor-pointer"
        aria-label="Carrito"
      >
        <svg
          className="w-7.5 h-7.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {itemCount > 0 && (
          <span className="absolute top-1 -right-1 bg-pink-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>

      {typeof document !== 'undefined' && createPortal(
        <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />,
        document.body
      )}
    </>
  );
}