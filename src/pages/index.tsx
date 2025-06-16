import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";

export const getStaticProps = async () => {
  if (!process.env.DATABASE_URL) {
    return {
      props: {},
      revalidate: 30,
    };
  }

  return {
    revalidate: 40,
    props: {},
  };
};

export default function Page({}: InferGetStaticPropsType<
  typeof getStaticProps
>) {
  return (
    <div className="w-full">
      <Head>
        <title>Jaaz</title>
        <meta name="description" content="AI design agent" />
      </Head>
      <h1>AI design agent, coming soon</h1>
    </div>
  );
}
