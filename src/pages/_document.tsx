import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  const unamiTrackingId = process.env.NEXT_PUBLIC_UNAMI_TRACKING_ID;
  const isProd = process.env.NODE_ENV === "production";
  return (
    <Html lang="en">
      <Head>
        {isProd && unamiTrackingId && (
          <script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id={unamiTrackingId}
          ></script>
        )}
      </Head>
      <body className="dark">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
