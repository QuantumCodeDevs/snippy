// ng serve proxy. Host dev defaults to PocketBase on localhost.
// Compose sets POCKETBASE_PROXY_TARGET=http://pocketbase:8090.
const target = process.env.POCKETBASE_PROXY_TARGET || 'http://127.0.0.1:8090';

function proxyOptions() {
  return {
    target,
    secure: false,
    changeOrigin: true,
    ws: true,
  };
}

module.exports = {
  '/api': proxyOptions(),
  '/sitemap.xml': { ...proxyOptions(), pathRewrite: { '^/sitemap\\.xml$': '/api/snippy/sitemap.xml' } },
  '/_/': proxyOptions(),
};
