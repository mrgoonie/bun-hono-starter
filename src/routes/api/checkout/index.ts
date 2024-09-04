import { billRouter } from '@/api/checkout/bill';
import { cartRouter } from '@/api/checkout/cart';
import { payment } from '@/api/checkout/payment';
import { createTRPCRouter } from '@/api/trpc';

export const checkoutRouter = createTRPCRouter({
	bill: billRouter,
	cart: cartRouter,
	payment: payment,
});
