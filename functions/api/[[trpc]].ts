import { fetchRequestHandler, FetchCreateContextOption } from "@trpc/server/adapters/fetch";
import { HoneydewPageEnv, HoneydewPagesFunction } from "../types";
import { createContextFactory } from "./context";
import { appRouter } from "./router";

export const onRequest: HoneydewPagesFunction = async (context) => {
  const createContext = await createContextFactory(context.data, context.env);
  return fetchRequestHandler({
    endpoint: "/api",
    req: context.request,
    router: appRouter,
    createContext,
  })
};