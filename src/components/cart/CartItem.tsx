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
          <div className="flex items-center rounded-lg bg-gray-100 shadow-inner w-fit">
            <button
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              className="w-8 h-8 flex items-center justify-center text-xl font-bold text-gray-600 bg-white rounded-l-lg border border-gray-300 hover:bg-pink-100 hover:text-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={item.quantity <= 1}
              aria-label="Disminuir cantidad"
            >
              −
            </button>
            <span className="w-10 h-8 flex items-center justify-center text-lg font-semibold text-gray-800 bg-transparent">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              className="w-8 h-8 flex items-center justify-center text-xl font-bold text-gray-600 bg-white rounded-r-lg border border-gray-300 hover:bg-pink-100 hover:text-pink-600 transition"
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>

          <button
            onClick={() => removeItem(item.productId)}
            className="text-red-500 hover:text-red-700 text-sm"
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
