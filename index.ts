import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import { createApp } from './src/app';
import { withHyperdrivePool } from './src/config/database';
import { handleOssRequest } from './src/oss-worker';

interface Env {
  HYPERDRIVE: any;
  OSS_ACCESS_KEY_ID: string;
  OSS_ACCESS_KEY_SECRET: string;
  OSS_STS_ROLE_ARN: string;
  OSS_BUCKET: string;
  OSS_REGION: string;
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const ossResponse = await handleOssRequest(request, env);
    if (ossResponse) return ossResponse;

    return withHyperdrivePool(env.HYPERDRIVE, async () => {
      const app = createApp();
      const server = createServer(app);
      const handler = httpServerHandler(server);
      return handler.fetch(request, env, ctx);
    });
  },
};
