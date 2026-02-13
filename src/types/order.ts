export type OrderItem = {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
}

export type OrderStatus = 
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export type Order = {
    id: string;
    order_number: number;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    items: OrderItem[];
    subtotal: number;
    shipping_cost: number;
    total: number;
    status: OrderStatus;
    notes?: string;
    whatsapp_sent_at?: string;
    created_at: string;
    updated_at: string;
}

export type CreateOrderInput = {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    items: OrderItem[];
    total: number;
    notes?: string;
}