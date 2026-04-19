export const config = { runtime: 'edge' };

export default function handler() {
  return new Response(JSON.stringify({ utcMs: Date.now() }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache',
    },
  });
}
