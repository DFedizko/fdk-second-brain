const IGNORE = (): void => {};

// Octokit logs failed requests with their URLs, which hold private note paths.
export const SILENT_LOG = { debug: IGNORE, info: IGNORE, warn: IGNORE, error: IGNORE };
