"use server";

/* eslint-disable @typescript-eslint/no-non-null-assertion -- checked in configureLemonSqueezy() */
import console from "node:console";
import crypto from "node:crypto";

import {
  cancelSubscription,
  createCheckout,
  createWebhook,
  getPrice,
  getProduct,
  getSubscription,
  listPrices,
  listProducts,
  listWebhooks,
  updateSubscription,
  type Variant,
} from "@lemonsqueezy/lemonsqueezy.js";
import { toInt } from "diginext-utils/dist/object";
import { makeSlug } from "diginext-utils/dist/Slug";

import { configureLemonSqueezy } from "@/lib/payment/lemonsqueezy";
import { verifyRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import type { Context } from "hono";

/**
 * This action will log out the current user.
 */
export async function logout() {
  // await signOut();
}

export async function fetchProductAndVariant(...params): Promise<any> {
  //

  try {
    console.log("fetchProductAndVariant");

    let page = 1;

    configureLemonSqueezy();
    console.log("configureLemonSqueezy");

    const fetchProductFromLemonsqueezy = async () => {
      //
      // Fetch products from the Lemon Squeezy store.
      const products = await listProducts({
        filter: { storeId: env.LEMONSQUEEZY_STORE_ID },
        include: ["variants"],
        page: {
          number: page,
        },
      });

      if (!products.data) throw new Error("Can't fetch");

      const { meta, data, included } = products.data as any;
      //

      const productsDb = [] as any;

      for (const item of data) {
        const { id, type, attributes, ...rest } = item;

        const _exited = await prisma.lemonsqueezyProduct.upsert({
          where: {
            product_id: toInt(id),
          },
          update: {
            type,
            slug: attributes.slug,
            attributes,
          },
          create: {
            product_id: toInt(id),
            type,
            slug: attributes.slug,
            attributes,
          },
        });

        productsDb.push(_exited);
      }

      for (const item of included) {
        const { id, type, attributes, ...rest } = item;

        const product = productsDb.find(
          (x) => x.product_id == attributes.product_id,
        );
        if (!product) throw Error("Product Not Found");

        const slug = makeSlug(`${product.slug} ${attributes.name}`);

        const exited = await prisma.lemonsqueezyVariant.upsert({
          where: {
            variant_id: toInt(id),
          },
          update: {
            type,
            slug,
            attributes,
            lemonsqueezyProduct: {
              connect: {
                product_id: toInt(attributes.product_id),
              },
            },
          },
          create: {
            variant_id: toInt(id),
            slug,
            type,
            attributes,
            lemonsqueezyProduct: {
              connect: {
                product_id: toInt(attributes.product_id),
              },
            },
          },
        });
      }

      //

      const { currentPage, from, lastPage, perPage, to, total } = meta.page;

      if (page < lastPage) {
        page++;
        await fetchProductFromLemonsqueezy();
      }
    };

    await fetchProductFromLemonsqueezy();
  } catch (error) {
    throw new Error(
      `fetchProductAndVariant failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

interface IgetCheckoutURL {
  variantId: number;
  redirectUrl: string;
  expiresAt?: string;
  embed?: boolean;
  customData?: any;
  c: Context;
}

/**
 * This action will create a checkout on Lemon Squeezy.
 */
export async function getCheckoutURL({
  variantId,
  redirectUrl,
  embed = false,
  customData = {},
  c,
  ...options
}: IgetCheckoutURL) {
  configureLemonSqueezy();

  await verifyRequest(c, async () => {});
  const user = c.get("user");
  // const { user } = await validateRequest();
  if (!user) {
    throw new Error("User is not authenticated.");
  }
  customData = {
    ...customData,
    user_id: user.id,
  };

  const checkout = await createCheckout(env.LEMONSQUEEZY_STORE_ID!, variantId, {
    checkoutOptions: {
      embed,
      media: false,
      logo: !embed,
    },
    ...(options?.expiresAt ? { expiresAt: options?.expiresAt } : {}),
    checkoutData: {
      email: user.email ?? undefined,
      custom: customData,
    },
    // src/app/api/payment/callback/[id]/route.ts
    productOptions: {
      enabledVariants: [variantId],
      redirectUrl,
      receiptButtonText: "Go to Dashboard",
      receiptThankYouNote: "Thank you for signing up to Lemon Stand!",
    },
  });

  if (!checkout.data?.data?.attributes?.url)
    throw new Error("Create Checkout Failed");

  return checkout.data?.data?.attributes?.url;
}

export async function getListProducts() {
  //
  console.log("getListProducts");
  try {
    console.log("action");

    // Fetch products from the Lemon Squeezy store.
    const products = await listProducts({
      filter: { storeId: env.LEMONSQUEEZY_STORE_ID },
      include: ["variants"],
    });

    return products.data;

    // Loop through all the variants.
    const allVariants = products.data?.included as
      | Variant["data"][]
      | undefined;

    return allVariants;

    // const list = [] as any;
    // // for...of supports asynchronous operations, unlike forEach.
    // if (allVariants) {
    // 	for (const v of allVariants) {
    // 		const variant = v.attributes;

    // 		// Skip draft variants or if there's more than one variant, skip the default
    // 		// variant. See https://docs.lemonsqueezy.com/api/variants
    // 		if (variant.status === "draft" || (allVariants.length !== 1 && variant.status === "pending")) {
    // 			// `return` exits the function entirely, not just the current iteration.
    // 			continue;
    // 		}

    // 		// Fetch the Product name.
    // 		const productName = (await getProduct(variant.product_id)).data?.data.attributes.name ?? "";
    // 		return productName;

    // 		// Fetch the Price object.
    // 		const variantPriceObject = await listPrices({
    // 			filter: {
    // 				variantId: v.id,
    // 			},
    // 		});

    // 		list.push(variantPriceObject);
    // 	}
    // }

    // return list;
  } catch (error) {
    throw new Error(
      `action failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return [];
}

/**
 * This action will check if a webhook exists on Lemon Squeezy. It will return
 * the webhook if it exists, otherwise it will return undefined.
 */
export async function hasWebhook() {
  configureLemonSqueezy();

  if (!env.LEMONSQUEEZY_WEBHOOK_URL) {
    throw new Error(
      "Missing required LEMONSQUEEZY_WEBHOOK_URL env variable. Please, set it in your .env file.",
    );
  }

  if (env.LEMONSQUEEZY_WEBHOOK_URL.indexOf("localhost") >= 0)
    throw new Error("Lemonsqueezy Webhook Url Ignoring localhost ");

  // Check if a webhook exists on Lemon Squeezy.
  const allWebhooks = await listWebhooks({
    filter: { storeId: env.LEMONSQUEEZY_STORE_ID },
  });

  // Check if LEMONSQUEEZY_WEBHOOK_URL ends with a slash. If not, add it.
  let webhookUrl = env.LEMONSQUEEZY_WEBHOOK_URL;
  if (!webhookUrl.endsWith("/")) {
    webhookUrl += "/";
  }
  webhookUrl += "api/payment/webhook";

  const webhook = allWebhooks.data?.data.find(
    (wh) => wh.attributes.url === webhookUrl && wh.attributes.test_mode,
  );
  return webhook;
}

/**
 * This action will set up a webhook on Lemon Squeezy to listen to
 * Subscription events. It will only set up the webhook if it does not exist.
 */
export async function setupWebhook() {
  try {
    configureLemonSqueezy();

    if (!env.LEMONSQUEEZY_WEBHOOK_URL) {
      throw new Error(
        "Missing required LEMONSQUEEZY_WEBHOOK_URL env variable. Please, set it in your .env file.",
      );
    }

    // Check if LEMONSQUEEZY_WEBHOOK_URL ends with a slash. If not, add it.
    let webhookUrl = env.LEMONSQUEEZY_WEBHOOK_URL;
    if (!webhookUrl.endsWith("/")) {
      webhookUrl += "/";
    }
    webhookUrl += "api/payment/webhook";

    // eslint-disable-next-line no-console -- allow
    console.log("Setting up a webhook on Lemon Squeezy (Test Mode)...");

    // Do not set a webhook on Lemon Squeezy if it already exists.
    let webhook = await hasWebhook();

    // If the webhook does not exist, create it.
    if (!webhook) {
      const newWebhook = await createWebhook(env.LEMONSQUEEZY_STORE_ID!, {
        secret: env.LEMONSQUEEZY_WEBHOOK_SECRET!,
        url: webhookUrl,
        testMode: true, // will create a webhook in Test mode only!
        events: [
          "order_created",
          "order_refunded",
          "subscription_created",
          "subscription_updated",
          "subscription_cancelled",
          "subscription_resumed",
          "subscription_expired",
          "subscription_paused",
          "subscription_unpaused",
          "subscription_payment_success",
          "subscription_payment_failed",
          "subscription_payment_recovered",
          "subscription_payment_refunded",
          "license_key_created",
          "license_key_updated",
        ],
      });

      webhook = newWebhook.data?.data;
    }

    // eslint-disable-next-line no-console -- allow
    console.log(`Webhook ${webhook?.id} created on Lemon Squeezy.`);
  } catch (error) {
    console.error(
      `Setup Webhook failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// /**
//  * This action will sync the product variants from Lemon Squeezy with the
//  * Plans database model. It will only sync the 'subscription' variants.
//  */
// export async function syncPlans() {
// 	configureLemonSqueezy();

// 	// Fetch all the variants from the database.
// 	const productVariants: NewPlan[] = await db.select().from(plans);

// 	// Helper function to add a variant to the productVariants array and sync it with the database.
// 	async function _addVariant(variant: NewPlan) {
// 		// eslint-disable-next-line no-console -- allow
// 		console.log(`Syncing variant ${variant.name} with the database...`);

// 		// Sync the variant with the plan in the database.
// 		await db.insert(plans).values(variant).onConflictDoUpdate({ target: plans.variantId, set: variant });

// 		/* eslint-disable no-console -- allow */
// 		console.log(`${variant.name} synced with the database...`);

// 		productVariants.push(variant);
// 	}

// 	// Fetch products from the Lemon Squeezy store.
// 	const products = await listProducts({
// 		filter: { storeId: env.LEMONSQUEEZY_STORE_ID },
// 		include: ["variants"],
// 	});

// 	// Loop through all the variants.
// 	const allVariants = products.data?.included as Variant["data"][] | undefined;

// 	// for...of supports asynchronous operations, unlike forEach.
// 	if (allVariants) {
// 		for (const v of allVariants) {
// 			const variant = v.attributes;

// 			// Skip draft variants or if there's more than one variant, skip the default
// 			// variant. See https://docs.lemonsqueezy.com/api/variants
// 			if (variant.status === "draft" || (allVariants.length !== 1 && variant.status === "pending")) {
// 				// `return` exits the function entirely, not just the current iteration.
// 				continue;
// 			}

// 			// Fetch the Product name.
// 			const productName = (await getProduct(variant.product_id)).data?.data.attributes.name ?? "";

// // Fetch the Price object.
// const variantPriceObject = await listPrices({
// 	filter: {
// 		variantId: v.id,
// 	},
// });

// 			const currentPriceObj = variantPriceObject.data?.data.at(0);
// 			const isUsageBased = currentPriceObj?.attributes.usage_aggregation !== null;
// 			const interval = currentPriceObj?.attributes.renewal_interval_unit;
// 			const intervalCount = currentPriceObj?.attributes.renewal_interval_quantity;
// 			const trialInterval = currentPriceObj?.attributes.trial_interval_unit;
// 			const trialIntervalCount = currentPriceObj?.attributes.trial_interval_quantity;

// 			const price = isUsageBased
// 				? currentPriceObj?.attributes.unit_price_decimal
// 				: currentPriceObj.attributes.unit_price;

// 			const priceString = price !== null ? price?.toString() ?? "" : "";

// 			const isSubscription = currentPriceObj?.attributes.category === "subscription";

// 			// If not a subscription, skip it.
// 			if (!isSubscription) {
// 				continue;
// 			}

// 			await _addVariant({
// 				name: variant.name,
// 				description: variant.description,
// 				price: priceString,
// 				interval,
// 				intervalCount,
// 				isUsageBased,
// 				productId: variant.product_id,
// 				productName,
// 				variantId: parseInt(v.id) as unknown as number,
// 				trialInterval,
// 				trialIntervalCount,
// 				sort: variant.sort,
// 			});
// 		}
// 	}

// 	return productVariants;
// }

// /**
//  * This action will store a webhook event in the database.
//  * @param eventName - The name of the event.
//  * @param body - The body of the event.
//  */
// export async function storeWebhookEvent(eventName: string, body: NewWebhookEvent["body"]) {
// 	if (!env.POSTGRES_URL) {
// 		throw new Error("POSTGRES_URL is not set");
// 	}

// 	const id = crypto.randomInt(100000000, 1000000000);

// 	const returnedValue = await db
// 		.insert(webhookEvents)
// 		.values({
// 			id,
// 			eventName,
// 			processed: false,
// 			body,
// 		})
// 		.onConflictDoNothing({ target: plans.id })
// 		.returning();

// 	return returnedValue[0];
// }

// /**
//  * This action will process a webhook event in the database.
//  */
// export async function processWebhookEvent(webhookEvent: NewWebhookEvent) {
// 	configureLemonSqueezy();

// 	const dbwebhookEvent = await db.select().from(webhookEvents).where(eq(webhookEvents.id, webhookEvent.id));

// 	if (dbwebhookEvent.length < 1) {
// 		throw new Error(`Webhook event #${webhookEvent.id} not found in the database.`);
// 	}

// 	if (!env.LEMONSQUEEZY_WEBHOOK_URL) {
// 		throw new Error("Missing required LEMONSQUEEZY_WEBHOOK_URL env variable. Please, set it in your .env file.");
// 	}

// 	let processingError = "";
// 	const eventBody = webhookEvent.body;

// 	if (!webhookHasMeta(eventBody)) {
// 		processingError = "Event body is missing the 'meta' property.";
// 	} else if (webhookHasData(eventBody)) {
// 		if (webhookEvent.eventName.startsWith("subscription_payment_")) {
// 			// Save subscription invoices; eventBody is a SubscriptionInvoice
// 			// Not implemented.
// 		} else if (webhookEvent.eventName.startsWith("subscription_")) {
// 			// Save subscription events; obj is a Subscription
// 			const attributes = eventBody.data.attributes;
// 			const variantId = attributes.variant_id as string;

// 			// We assume that the Plan table is up to date.
// 			const plan = await db
// 				.select()
// 				.from(plans)
// 				.where(eq(plans.variantId, parseInt(variantId, 10)));

// 			if (plan.length < 1) {
// 				processingError = `Plan with variantId ${variantId} not found.`;
// 			} else {
// 				// Update the subscription in the database.

// 				const priceId = attributes.first_subscription_item.price_id;

// 				// Get the price data from Lemon Squeezy.
// 				const priceData = await getPrice(priceId);
// 				if (priceData.error) {
// 					processingError = `Failed to get the price data for the subscription ${eventBody.data.id}.`;
// 				}

// 				const isUsageBased = attributes.first_subscription_item.is_usage_based;
// 				const price = isUsageBased
// 					? priceData.data?.data.attributes.unit_price_decimal
// 					: priceData.data?.data.attributes.unit_price;

// 				const updateData: NewSubscription = {
// 					lemonSqueezyId: eventBody.data.id,
// 					orderId: attributes.order_id as number,
// 					name: attributes.user_name as string,
// 					email: attributes.user_email as string,
// 					status: attributes.status as string,
// 					statusFormatted: attributes.status_formatted as string,
// 					renewsAt: attributes.renews_at as string,
// 					endsAt: attributes.ends_at as string,
// 					trialEndsAt: attributes.trial_ends_at as string,
// 					price: price?.toString() ?? "",
// 					isPaused: false,
// 					subscriptionItemId: attributes.first_subscription_item.id,
// 					isUsageBased: attributes.first_subscription_item.is_usage_based,
// 					userId: eventBody.meta.custom_data.user_id,
// 					planId: plan[0].id,
// 				};

// 				// Create/update subscription in the database.
// 				try {
// 					await db.insert(subscriptions).values(updateData).onConflictDoUpdate({
// 						target: subscriptions.lemonSqueezyId,
// 						set: updateData,
// 					});
// 				} catch (error) {
// 					processingError = `Failed to upsert Subscription #${updateData.lemonSqueezyId} to the database.`;
// 					console.error(error);
// 				}
// 			}
// 		} else if (webhookEvent.eventName.startsWith("order_")) {
// 			// Save orders; eventBody is a "Order"
// 			/* Not implemented */
// 		} else if (webhookEvent.eventName.startsWith("license_")) {
// 			// Save license keys; eventBody is a "License key"
// 			/* Not implemented */
// 		}

// 		// Update the webhook event in the database.
// 		await db
// 			.update(webhookEvents)
// 			.set({
// 				processed: true,
// 				processingError,
// 			})
// 			.where(eq(webhookEvents.id, webhookEvent.id));
// 	}
// }

// /**
//  * This action will get the subscriptions for the current user.
//  */
// export async function getUserSubscriptions() {
// 	const session = await auth();
// 	const userId = session?.user?.id;

// 	if (!userId) {
// 		notFound();
// 	}

// 	const userSubscriptions: NewSubscription[] = await db
// 		.select()
// 		.from(subscriptions)
// 		.where(eq(subscriptions.userId, userId));

// 	return userSubscriptions;
// }

// /**
//  * This action will get the subscription URLs (update_payment_method and
//  * customer_portal) for the given subscription ID.
//  *
//  */
// export async function getSubscriptionURLs(id: string) {
// 	configureLemonSqueezy();
// 	const subscription = await getSubscription(id);

// 	if (subscription.error) {
// 		throw new Error(subscription.error.message);
// 	}

// 	return subscription.data?.data.attributes.urls;
// }

// /**
//  * This action will cancel a subscription on Lemon Squeezy.
//  */
// export async function cancelSub(id: string) {
// 	configureLemonSqueezy();

// 	// Get user subscriptions
// 	const userSubscriptions = await getUserSubscriptions();

// 	// Check if the subscription exists
// 	const subscription = userSubscriptions.find((sub) => sub.lemonSqueezyId === id);

// 	if (!subscription) {
// 		throw new Error(`Subscription #${id} not found.`);
// 	}

// 	const cancelledSub = await cancelSubscription(id);

// 	if (cancelledSub.error) {
// 		throw new Error(cancelledSub.error.message);
// 	}

// 	// Update the db
// 	try {
// 		await db
// 			.update(subscriptions)
// 			.set({
// 				status: cancelledSub.data?.data.attributes.status,
// 				statusFormatted: cancelledSub.data?.data.attributes.status_formatted,
// 				endsAt: cancelledSub.data?.data.attributes.ends_at,
// 			})
// 			.where(eq(subscriptions.lemonSqueezyId, id));
// 	} catch (error) {
// 		throw new Error(`Failed to cancel Subscription #${id} in the database.`);
// 	}

// 	revalidatePath("/");

// 	return cancelledSub;
// }

// /**
//  * This action will pause a subscription on Lemon Squeezy.
//  */
// export async function pauseUserSubscription(id: string) {
// 	configureLemonSqueezy();

// 	// Get user subscriptions
// 	const userSubscriptions = await getUserSubscriptions();

// 	// Check if the subscription exists
// 	const subscription = userSubscriptions.find((sub) => sub.lemonSqueezyId === id);

// 	if (!subscription) {
// 		throw new Error(`Subscription #${id} not found.`);
// 	}

// 	const returnedSub = await updateSubscription(id, {
// 		pause: {
// 			mode: "void",
// 		},
// 	});

// 	// Update the db
// 	try {
// 		await db
// 			.update(subscriptions)
// 			.set({
// 				status: returnedSub.data?.data.attributes.status,
// 				statusFormatted: returnedSub.data?.data.attributes.status_formatted,
// 				endsAt: returnedSub.data?.data.attributes.ends_at,
// 				isPaused: returnedSub.data?.data.attributes.pause !== null,
// 			})
// 			.where(eq(subscriptions.lemonSqueezyId, id));
// 	} catch (error) {
// 		throw new Error(`Failed to pause Subscription #${id} in the database.`);
// 	}

// 	revalidatePath("/");

// 	return returnedSub;
// }

// /**
//  * This action will unpause a subscription on Lemon Squeezy.
//  */
// export async function unpauseUserSubscription(id: string) {
// 	configureLemonSqueezy();

// 	// Get user subscriptions
// 	const userSubscriptions = await getUserSubscriptions();

// 	// Check if the subscription exists
// 	const subscription = userSubscriptions.find((sub) => sub.lemonSqueezyId === id);

// 	if (!subscription) {
// 		throw new Error(`Subscription #${id} not found.`);
// 	}

// 	const returnedSub = await updateSubscription(id, {
// 		// @ts-expect-error -- null is a valid value for pause
// 		pause: null,
// 	});

// 	// Update the db
// 	try {
// 		await db
// 			.update(subscriptions)
// 			.set({
// 				status: returnedSub.data?.data.attributes.status,
// 				statusFormatted: returnedSub.data?.data.attributes.status_formatted,
// 				endsAt: returnedSub.data?.data.attributes.ends_at,
// 				isPaused: returnedSub.data?.data.attributes.pause !== null,
// 			})
// 			.where(eq(subscriptions.lemonSqueezyId, id));
// 	} catch (error) {
// 		throw new Error(`Failed to pause Subscription #${id} in the database.`);
// 	}

// 	revalidatePath("/");

// 	return returnedSub;
// }

// /**
//  * This action will change the plan of a subscription on Lemon Squeezy.
//  */
// export async function changePlan(currentPlanId: number, newPlanId: number) {
// 	configureLemonSqueezy();

// 	// Get user subscriptions
// 	const userSubscriptions = await getUserSubscriptions();

// 	// Check if the subscription exists
// 	const subscription = userSubscriptions.find((sub) => sub.planId === currentPlanId);

// 	if (!subscription) {
// 		throw new Error(`No subscription with plan id #${currentPlanId} was found.`);
// 	}

// 	// Get the new plan details from the database.
// 	const newPlan = await db.select().from(plans).where(eq(plans.id, newPlanId)).then(takeUniqueOrThrow);

// 	// Send request to Lemon Squeezy to change the subscription.
// 	const updatedSub = await updateSubscription(subscription.lemonSqueezyId, {
// 		variantId: newPlan.variantId,
// 	});

// 	// Save in db
// 	try {
// 		await db
// 			.update(subscriptions)
// 			.set({
// 				planId: newPlanId,
// 				price: newPlan.price,
// 				endsAt: updatedSub.data?.data.attributes.ends_at,
// 			})
// 			.where(eq(subscriptions.lemonSqueezyId, subscription.lemonSqueezyId));
// 	} catch (error) {
// 		throw new Error(`Failed to update Subscription #${subscription.lemonSqueezyId} in the database.`);
// 	}

// 	revalidatePath("/");

// 	return updatedSub;
// }

try {
  setupWebhook();
} catch (error) {
  // throw new Error(`Setup Webhook failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
