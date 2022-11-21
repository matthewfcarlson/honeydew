import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { HoneydewPageEnv, HoneydewPagesFunction } from "../types";
import { createContext } from "./context";
import { appRouter } from "./router";

export const onRequest: HoneydewPagesFunction = async (context) => {
  return fetchRequestHandler({
    endpoint: "/api",
    req: context.request,
    router: appRouter,
    createContext: createContext(context)
  })
};