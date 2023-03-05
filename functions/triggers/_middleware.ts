import { topLevelHandler } from "../auth/_middleware";
import type { HoneydewPagesFunction } from "../types";

/* istanbul ignore next */
export const onRequest: HoneydewPagesFunction[] = [topLevelHandler]