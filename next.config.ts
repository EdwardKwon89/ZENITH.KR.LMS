import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone' as const,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' blob:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.kakaocdn.net https://t1.daumcdn.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://t1.kakaocdn.net https://t1.daumcdn.net",
              "font-src 'self' https://cdn.jsdelivr.net",
              "connect-src 'self' data: https://*.supabase.co https://*.sentry.io https://cdn.jsdelivr.net https://t1.kakaocdn.net https://t1.daumcdn.net http://127.0.0.1:54321 http://localhost:54321 ws://localhost:3000 ws://127.0.0.1:3000",
              "worker-src 'self' blob:",
              "frame-src https://postcode.map.daum.net http://postcode.map.daum.net https://postcode.map.kakao.com http://postcode.map.kakao.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // Next 16.3+는 기본으로 TypeScript CLI(tsc)를 사용해 tsconfig의 전체 파일(테스트 포함)을 검사한다.
  // 이 저장소의 tests/ 에는 기존 타입 오류가 다수 있고 CI도 advisory로만 다루므로(IMP-134),
  // next build의 타입 검사를 16.2.4와 동일한 동작(JS 컴파일러 API)으로 유지한다.
  // TODO(IMP-190): tests/ 타입 오류 정리 후 이 옵션 제거 검토.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "zenith-t2z",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
