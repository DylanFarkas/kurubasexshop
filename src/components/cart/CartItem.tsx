import {
  useCartStore,
  type CartItem as CartItemType,
} from "../../stores/cartStore";
import { formatPrice } from "../../utils/formatters";

export default function CartItem({ item }: { item: CartItemType }) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const price = item.finalPrice ?? item.price;
  const subtotal = price * item.quantity;

  return (
    <div className="flex gap-4 pb-4 border-b border-gray-300">
      <a href={`/producto/${item.slug}`} className="shrink-0">
        <img
          src={item.image || "/placeholder.png"}
          alt={item.name}
          className="w-20 h-20 object-cover rounded-lg"
        />
      </a>

      <div className="flex-1 min-w-0">
        <a
          href={`/producto/${item.slug}`}
          className="font-semibold hover:text-pink-600 transition line-clamp-2"
        >
          {item.name}
        </a>
        <p className="text-gray-600 text-sm mt-1">{formatPrice(price)}</p>

        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center bg-white shadow-lg border border-pink-200 rounded-full px-2 py-1">
            <button
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              className="w-9 h-9 flex items-center justify-center bg-pink-200 font-bold text-2xl rounded-full shadow transition hover:scale-105 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={item.quantity <= 1}
              aria-label="Disminuir cantidad"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <span className="w-10 h-9 flex items-center justify-center text-lg font-semibold text-gray-800 bg-transparent select-none">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              className="w-9 h-9 flex items-center justify-center bg-pink-200 font-bold text-2xl rounded-full shadow transition hover:scale-105 focus:outline-none cursor-pointer"
              aria-label="Aumentar cantidad"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => removeItem(item.productId)}
            className="text-red-500 hover:text-red-700 text-sm cursor-pointer transition"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="text-right">
        <p className="font-semibold">{formatPrice(subtotal)}</p>
      </div>
    </div>
  );
}
