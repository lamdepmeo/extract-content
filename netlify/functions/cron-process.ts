import type { Handler } from '@netlify/functions';
import { processJobBatch } from '../../lib/jobs';

export const handler: Handler = async () => {
  try {
    const result = await processJobBatch(20);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, ...result }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';

    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: message }),
    };
  }
};

export const config = {
  schedule: '*/15 * * * *',
};
