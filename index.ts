import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./src/app";
import { getPool } from "./src/config/database";

interface Env {
  HYPERDRIVE: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const pool = getPool(env.HYPERDRIVE);
    const app = createApp();

    // 中间件挂载 pool，恢复回来
    app.use((req: any, res: any, next: () => void) => {
      req.dbPool = pool;
      next();
    });

    const server = createServer(app);
    const handler = httpServerHandler(server);
    return handler.fetch(request, env, ctx);
  },
};

