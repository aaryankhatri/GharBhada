// Vercel serverless entry point. Deploys the exact same Express app used for local dev
// (see src/index.ts) but invoked per-request as a function instead of bound to a long-running
// port — this is what gives fast (~1-2s) cold starts instead of a sleeping-dyno wake-up delay.
import app from '../src/app';

export default app;
