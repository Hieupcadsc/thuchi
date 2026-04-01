/**
 * Next.js instrumentation hook – runs once on server startup.
 * Creates all Neon tables if they don't exist yet.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initNeonDb } = await import('./lib/neon');
    await initNeonDb().catch(err =>
      console.error('[instrumentation] Neon init failed:', err)
    );
  }
}
