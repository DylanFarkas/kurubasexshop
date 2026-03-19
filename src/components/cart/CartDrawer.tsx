import { useCartStore } from '../../stores/cartStore';
import { formatPrice } from '../../utils/formatters';
import CartItem from './CartItem';

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const items = useCartStore(state => state.items);
  const total = useCartStore(state => state.getTotal());
  const itemCount = useCartStore(state => state.getItemCount());

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'z-50 opacity-100' : 'opacity-0 pointer-events-none -z-10'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed font-sans right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[#d8d2c8] bg-[white] shadow-2xl transition-transform duration-300 dark:border-[#1a1a18] dark:bg-[#0f0f0d] ${
          isOpen ? 'z-50 translate-x-0' : 'z-50 translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d8d2c8] p-6 dark:border-[#1a1a18]">
          <h2 className="font-sans text-2xl font-normal tracking-wide text-[#0f0f0d] dark:text-[#f0ece4]">
            CARRITO ({itemCount})
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 text-[#6a6560] transition hover:text-[#0f0f0d] dark:text-[#8b8a83] dark:hover:text-[#f0ece4]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="py-16 text-center text-[#6a6560] dark:text-[#8b8a83]">
              <p className="mb-4">Tu carrito está vacío</p>
              <a
                href='/tienda'
                onClick={onClose}
                className="cursor-pointer font-medium uppercase tracking-[0.12em] text-[#1e1c18] hover:underline dark:text-[#f0ece4]"
              >
                Ir a la tienda
              </a>
            </div>
          ) : (
            items.map(item => (
              <CartItem key={item.productId} item={item} />
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="space-y-4 border-t border-[#d8d2c8] p-6 dark:border-[#1a1a18]">
            <div className="flex justify-between font-serif text-xl tracking-wide text-[#0f0f0d] dark:text-[#f0ece4]">
              <span>TOTAL:</span>
              <span>{formatPrice(total)}</span>
            </div>
            <a
              href="/checkout"
              className="block w-full border border-[#2a2520] bg-transparent py-4 text-center font-medium uppercase tracking-[0.16em] text-[#1e1c18] transition-colors duration-200 hover:border-[#b4704a] hover:text-[#b4704a] dark:border-[#8b8a83] dark:text-[#f0ece4] dark:hover:border-[#f0ece4]"
            >
              Proceder al Checkout
            </a>
          </div>
        )}
      </div>
    </>
  );
}