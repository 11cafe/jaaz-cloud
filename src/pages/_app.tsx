import type { AppProps } from "next/app";
import Layout from "../components/layout";
import Head from "next/head";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { swrLocalStorageProvider } from "@/utils/swrutils";
import { Toaster } from "@/components/ui/toaster";
import "@/i18n";
import "@/global.css";

function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        <link rel="shortcut icon" href="../../favicon.ico" />
      </Head>

      <SWRConfig value={{ provider: swrLocalStorageProvider }}>
        <SessionProvider session={session}>
          {(Component as { noLayout?: boolean }).noLayout ? (
            <Component {...pageProps} />
          ) : (
            <Layout>
              <Component {...pageProps} />
            </Layout>
          )}
          <Toaster />
        </SessionProvider>
      </SWRConfig>
    </>
  );
}

export default App;
