import { NextRequest, NextResponse } from "next/server";

function customMiddleware(config: any) {
  return function (req: NextRequest, ev: any) {
    return NextResponse.next();
  };
}

export default customMiddleware({
  pages: {
    signIn: "/auth/signin",
  },
});
