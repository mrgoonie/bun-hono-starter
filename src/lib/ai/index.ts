import { z } from 'zod';

import { env } from '@/env';

export const AskAiMessageSchema = z.object({
	role: z.enum(['system', 'assistant', 'user']),
	content: z.union([
		z.string(),
		z.object({ type: z.enum(['text']), text: z.string() }),
		z.object({
			type: z.enum(['image_url']),
			text: z.union([
				z.string(),
				z.object({
					// URL or base64 encoded image data
					url: z.string(),
					// Optional, defaults to 'auto'
					detail: z.string().optional(),
				}),
			]),
		}),
	]),
});
export type AskAiMessage = z.infer<typeof AskAiMessageSchema>;

export const AskAiParamsSchema = z.object({
	model: z.string().default('meta-llama/llama-3.1-8b-instruct'),
	messages: z.array(AskAiMessageSchema).describe(`Array of messages.`),
	stream: z.boolean().default(false),
	// Range: [0, 2]
	temperature: z.number().min(0).max(2).default(1),
	response_format: z.object({ type: z.string() }).optional(),
});
export type AskAiParams = z.infer<typeof AskAiParamsSchema>;

export const AskAiResponseUsageSchema = z.object({
	/** Including images and tools if any */
	prompt_tokens: z.number(),
	/** The tokens generated */
	completion_tokens: z.number(),
	/** Sum of the above two fields */
	total_tokens: z.number(),
});
export type AskAiResponseUsage = z.infer<typeof AskAiResponseUsageSchema>;

export const AskAiErrorSchema = z.object({
	// See "Error Handling" section
	code: z.number(),
	message: z.string(),
});
export type AskAiError = z.infer<typeof AskAiErrorSchema>;

export const AskAiResponseChoiceSchema = z.union([
	// NonChatChoice
	z.object({ finish_reason: z.string().nullable(), text: z.string(), error: AskAiErrorSchema.optional() }),
	// NonStreamingChoice
	z.object({
		finish_reason: z.string().nullable(),
		message: z.object({
			content: z.string().nullable(),
			role: z.string(),
		}),
		error: AskAiErrorSchema.optional(),
	}),
	// StreamingChoice
	z.object({
		finish_reason: z.string().nullable(),
		delta: z.object({
			content: z.string().nullable(),
			role: z.string().nullable(),
		}),
		error: AskAiErrorSchema.optional(),
	}),
]);
export type AskAiResponseChoice = z.infer<typeof AskAiResponseChoiceSchema>;

export const AskAiResponseSchema = z.object({
	id: z.string(),
	// Depending on whether you set "stream" to "true" and
	// whether you passed in "messages" or a "prompt", you
	// will get a different output shape
	choices: z.array(AskAiResponseChoiceSchema),
	created: z.number(), // Unix timestamp
	model: z.string(),
	object: z.enum(['chat.completion', 'chat.completion.chunk']),

	system_fingerprint: z.string(), // Only present if the provider supports it

	// Usage data is always returned for non-streaming.
	// When streaming, you will get one usage object at
	// the end accompanied by an empty choices array.
	usage: AskAiResponseUsageSchema,
});
export type AskAiResponse = z.infer<typeof AskAiResponseSchema>;

export const ParamsResponseSchema = z.object({
	data: z.object({
		model: z.string(),
		supported_parameters: z.array(z.string()),
		frequency_penalty_p10: z.number(),
		frequency_penalty_p50: z.number(),
		frequency_penalty_p90: z.number(),
		min_p_p10: z.number(),
		min_p_p50: z.number(),
		min_p_p90: z.number(),
		presence_penalty_p10: z.number(),
		presence_penalty_p50: z.number(),
		presence_penalty_p90: z.number(),
		repetition_penalty_p10: z.number(),
		repetition_penalty_p50: z.number(),
		repetition_penalty_p90: z.number(),
		temperature_p10: z.number(),
		temperature_p50: z.number(),
		temperature_p90: z.number(),
		top_a_p10: z.number(),
		top_a_p50: z.number(),
		top_a_p90: z.number(),
		top_k_p10: z.number(),
		top_k_p50: z.number(),
		top_k_p90: z.number(),
		top_p_p10: z.number(),
		top_p_p50: z.number(),
		top_p_p90: z.number(),
	}),
});
export type ParamsResponse = z.infer<typeof ParamsResponseSchema>;

/**
 * This API lets you query the top LLM sampling parameter configurations used by users on OpenRouter.
 * @param model - LLM model ID
 */
export async function getParams(model: string) {
	const response = await fetch(`https://openrouter.ai/api/v1/parameters/${model}`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${env.OPENROUTER_KEY}`,
			'HTTP-Referer': `${env.baseUrl()}`, // Optional, for including your app on openrouter.ai rankings.
			'X-Title': `${env.SITE_TITLE}`, // Optional. Shows in rankings on openrouter.ai.
			'Content-Type': 'application/json',
		},
	});
	const { data } = (await response.json()) as ParamsResponse;
	return data;
}

export const askAi = async (params: AskAiParams) => {
	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.OPENROUTER_KEY}`,
			'HTTP-Referer': `${env.baseUrl()}`, // Optional, for including your app on openrouter.ai rankings.
			'X-Title': `${env.SITE_TITLE}`, // Optional. Shows in rankings on openrouter.ai.
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(params),
	});
	if (params.stream && response.body) {
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let result = '';
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			result += decoder.decode(value, { stream: true });
		}
		console.log('askAi() > result :>> ', result);
		return JSON.parse(result) as AskAiResponse;
	} else {
		const json = await response.json();
		console.log('askAi() > json :>> ', json);
		return json as AskAiResponse;
	}
};

/**
 * @example
 * {
  "model": "meta-llama/llama-3.1-8b-instruct:free",
  "messages": [
    {
      "role": "system",
      "content": "you are a helpful assistant"
    },
    {
      "role": "user",
      "content": "how are you?"
    }
  ],
  "stream": false,
  "temperature": 1
}
 */
