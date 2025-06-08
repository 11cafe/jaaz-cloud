import { AppContext } from "@/AppContext";
import Navbar from "./navbar";
// import { Inter } from "next/font/google";
import React, { HTMLProps, useState } from "react";
import { FooterCentered } from "./FooterCentered";
import { EAppRoute } from "@/consts/types";

// const fontSans = Inter({
//   subsets: ["latin"],
//   variable: "--font-sans",
// });

export default function Layout({ children }: HTMLProps<HTMLDivElement>) {
  const [route, setRoute] = useState<EAppRoute>(EAppRoute.root);

  return (
    <AppContext.Provider value={{ route: route, setRoute: setRoute }}>
      <div className="flex flex-col w-full max-w-screen-2xl items-center overflow-hidden min-h-screen mx-auto">
        <Navbar />
        <div className="flex flex-1 justify-center w-full min-h-[calc(100vh-200px)]">
          {children}
        </div>
        <FooterCentered />
      </div>
    </AppContext.Provider>
  );
}
