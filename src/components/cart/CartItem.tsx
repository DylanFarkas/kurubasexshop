import { useCartStore, type CartItem as CartItemType } from '../../stores/cartStore';
import { formatPrice } from '../../utils/formatters';

export default function CartItem({ item }: { item: CartItemType }) {
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);

  const price = item.finalPrice ?? item.price;
  const subtotal = price * item.quantity;

  return (
    <div className="flex gap-4 pb-4 border-b">
      <a href={`/producto/${item.slug}`} className="shrink-0">
        <img
          src={item.image || '/placeholder.png'}
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
          <div className="flex items-center border rounded-lg">
            <button
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              className="px-3 py-1 hover:bg-gray-100 transition"
              disabled={item.quantity <= 1}
            >
              −
            </button>
            <span className="px-4 py-1 border-x">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              className="px-3 py-1 hover:bg-gray-100 transition"
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