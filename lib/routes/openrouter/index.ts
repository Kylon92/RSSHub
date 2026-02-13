import type { DataItem, Route } from '@/types';
import got from '@/utils/got';

export const route: Route = {
    path: '/models',
    categories: ['programming'],
    example: '/openrouter/models',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['openrouter.ai/'],
            target: '/models',
        },
    ],
    name: 'New Models',
    maintainers: ['Kylon92'],
    handler,
    description: 'Get the latest models available on OpenRouter.',
};

interface OpenRouterModel {
    id: string;
    name: string;
    description: string;
    created: number;
    context_length: number;
    canonical_slug: string;
    hugging_face_id: string | null;
    architecture: {
        modality: string;
        input_modalities: string[];
        output_modalities: string[];
        tokenizer: string;
        instruct_type: string | null;
    };
    pricing: {
        prompt: string;
        completion: string;
        image?: string;
        request?: string;
        web_search?: string;
        input_cache_read?: string;
        input_cache_write?: string;
        internal_reasoning?: string;
        audio?: string;
    };
    top_provider: {
        context_length: number | null;
        max_completion_tokens: number | null;
        is_moderated: boolean;
    };
}

async function handler(ctx: any) {
    const limit = Number(ctx.req.query('limit')) || 10;
    const apiUrl = 'https://openrouter.ai/api/v1/models';

    const response = await got(apiUrl);
    const parsed: { data: OpenRouterModel[] } = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    const models = parsed.data
        .filter((model) => model.created)
        .toSorted((a, b) => b.created - a.created)
        .slice(0, limit);

    const items: DataItem[] = models.map((model) => {
        const promptPrice = Number.parseFloat(model.pricing.prompt);
        const completionPrice = Number.parseFloat(model.pricing.completion);
        const isFree = promptPrice === 0 && completionPrice === 0;

        const pricingInfo = isFree ? '💰 <strong>Pricing:</strong> Free' : `💰 <strong>Pricing:</strong> $${(promptPrice * 1_000_000).toFixed(2)} / 1M input tokens, $${(completionPrice * 1_000_000).toFixed(2)} / 1M output tokens`;

        const contextInfo = model.context_length ? `${(model.context_length / 1024).toFixed(0)}K` : 'N/A';
        const maxOutput = model.top_provider.max_completion_tokens ? `${(model.top_provider.max_completion_tokens / 1024).toFixed(0)}K` : 'N/A';

        const description = `
<p>${model.description || 'No description available.'}</p>
<hr>
<ul>
    <li>🏷️ <strong>ID:</strong> <code>${model.id}</code></li>
    <li>🔀 <strong>Modality:</strong> ${model.architecture.modality}</li>
    <li>📐 <strong>Context Length:</strong> ${contextInfo} tokens</li>
    <li>📤 <strong>Max Output:</strong> ${maxOutput} tokens</li>
    <li>🔤 <strong>Tokenizer:</strong> ${model.architecture.tokenizer}</li>
    <li>${pricingInfo}</li>
    ${model.hugging_face_id ? `<li>🤗 <strong>HuggingFace:</strong> <a href="https://huggingface.co/${model.hugging_face_id}">${model.hugging_face_id}</a></li>` : ''}
    ${model.top_provider.is_moderated ? '<li>🛡️ <strong>Moderated:</strong> Yes</li>' : ''}
</ul>`.trim();

        return {
            title: `${model.name}${isFree ? ' (Free)' : ''}`,
            description,
            link: `https://openrouter.ai/${model.canonical_slug || model.id}`,
            pubDate: new Date(model.created * 1000).toUTCString(),
            guid: model.id,
            category: [model.architecture.modality, ...(isFree ? ['free'] : ['paid']), ...model.architecture.input_modalities],
        };
    });

    return {
        title: 'OpenRouter - New Models',
        link: 'https://openrouter.ai/models',
        description: 'Latest models available on OpenRouter',
        item: items,
    };
}
