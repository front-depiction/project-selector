/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as lib_congestion from "../lib/congestion.js";
import type * as preferences from "../preferences.js";
import type * as schemas_Preference from "../schemas/Preference.js";
import type * as schemas_SelectionPeriod from "../schemas/SelectionPeriod.js";
import type * as schemas_Topic from "../schemas/Topic.js";
import type * as stats from "../stats.js";
import type * as topics from "../topics.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "lib/congestion": typeof lib_congestion;
  preferences: typeof preferences;
  "schemas/Preference": typeof schemas_Preference;
  "schemas/SelectionPeriod": typeof schemas_SelectionPeriod;
  "schemas/Topic": typeof schemas_Topic;
  stats: typeof stats;
  topics: typeof topics;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
