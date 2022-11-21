import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { HoneydewPageEnv } from "../types";
import { createContext } from "./context";
import { appRouter } from "./router";

export const onRequest: PagesFunction<HoneydewPageEnv> = async (context) => {
  return fetchRequestHandler({
    endpoint: "/api",
    req: context.request,
    router: appRouter,
    createContext,
  })
};