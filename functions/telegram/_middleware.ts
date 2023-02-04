import { jwtHandler, topLevelHandler, userAuthHandler } from "../auth/_middleware";
import type { HoneydewPagesFunction } from "../types";

export const onRequest: HoneydewPagesFunction[] = [topLevelHandler,]