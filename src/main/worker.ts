const NOT_FOUND = 404;

export default {
  fetch: (): Response => new Response(null, { status: NOT_FOUND }),
} satisfies ExportedHandler<Env>;
