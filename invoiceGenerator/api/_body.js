/**
 * Read and JSON-parse the request body for Vercel serverless functions.
 * @vercel/node does not auto-parse req.body — this replaces Express body-parser.
 */
export function parseBody(req) {
  return new Promise((resolve, reject) => {
    // Already parsed (some environments do this)
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }

    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}
