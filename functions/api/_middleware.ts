import { jwtHandler, topLevelHandler, userAuthHandler } from "../auth/_middleware";
import type { HoneydewPagesFunction } from "../types";

/* istanbul ignore next */
export const onRequest: HoneydewPagesFunction[] = [topLevelHandler, jwtHandler, userAuthHandler]