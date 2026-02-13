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
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'z-50 opacity-100' : 'opacity-0 pointer-events-none -z-10'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? 'z-50 translate-x-0' : 'z-50 translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            Carrito ({itemCount})
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="mb-4">Tu carrito está vacío</p>
              <button
                onClick={onClose}
                className="text-pink-600 hover:underline"
              >
                Ir a la tienda
              </button>
            </div>
          ) : (
            items.map(item => (
              <CartItem key={item.productId} item={item} />
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-6 space-y-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Total:</span>
              <span>{formatPrice(total)}</span>
            </div>
            <a
              href="/checkout"
              className="block w-full py-4 bg-pink-600 text-white text-center rounded-lg font-semibold hover:bg-pink-700 transition"
            >
              Proceder al Checkout
            </a>
          </div>
        )}
      </div>
    </>
  );
}