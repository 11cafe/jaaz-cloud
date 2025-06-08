import { createContext } from "react";
import { EAppRoute } from "./consts/types";

export type AppContextType = {
  route: EAppRoute;
  setRoute: (route: EAppRoute) => void;
};

export const AppContext = createContext<AppContextType>({
  route: EAppRoute.root,
  setRoute: () => {},
});
