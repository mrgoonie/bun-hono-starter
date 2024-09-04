/* eslint-disable prefer-destructuring */

import { z } from 'zod';

import { respondFailure, respondSuccess } from '@/modules/response/respond-helper';
import { createTRPCRouter, protectedProcedure } from '@/api/trpc';
import { ApiResponseSchema } from '@/modules/response/api-response';
import { askAi, AskAiParamsSchema, getParams } from '@/lib/ai';

export const askAiRouter = createTRPCRouter({
	send: protectedProcedure
		.meta({
			openapi: {
				method: 'POST',
				path: '/ask-ai',
				tags: ['Ask AI'],
				summary: 'Send prompt to AI request.',
				protect: true,
			},
		})
		.input(AskAiParamsSchema)
		.output(ApiResponseSchema)
		.mutation(async ({ input }) => {
			console.log('[ASK AI ROUTER] ask AI > input :>> ', input);
			// return res;
			try {
				const data = await askAi(input);
				return respondSuccess({ data });
			} catch (e) {
				console.error(`[ASK AI ROUTER] Error: ${e}`);
				return respondFailure(`Unable to ask AI: ${e}`);
			}
		}),
	getParams: protectedProcedure
		.meta({
			openapi: {
				method: 'GET',
				path: '/ask-ai/params',
				tags: ['Ask AI'],
				summary: 'Get params of an LLM model.',
				protect: true,
			},
		})
		.input(z.object({ model: z.string() }))
		.output(ApiResponseSchema)
		.mutation(async ({ input }) => {
			console.log('[ASK AI ROUTER] get params > input :>> ', input);
			// return res;
			try {
				const data = await getParams(input.model);
				return respondSuccess({ data });
			} catch (e) {
				console.error(`[ASK AI ROUTER] get params > Error: ${e}`);
				return respondFailure(`Unable to get model params: ${e}`);
			}
		}),
});
