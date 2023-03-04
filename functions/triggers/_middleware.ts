import { topLevelHandler } from "../auth/_middleware";
import type { HoneydewPagesFunction } from "../types";

export const onRequest: HoneydewPagesFunction[] = [topLevelHandler]