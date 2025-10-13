/**
 * Health & version status function
 * Called by the app (e.g. in debug panel) to check backend reachability or version
 */

export const handler = async () => {
  const version = process.env.CONTEXT || 'local';
  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', version })
  };
};
