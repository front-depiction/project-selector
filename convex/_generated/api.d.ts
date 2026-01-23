/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as assignWithCPSAT from "../assignWithCPSAT.js";
import type * as assignmentSolver from "../assignmentSolver.js";
import type * as assignments from "../assignments.js";
import type * as constraints from "../constraints.js";
import type * as http from "../http.js";
import type * as lib_congestion from "../lib/congestion.js";
import type * as lib_slugGenerator from "../lib/slugGenerator.js";
import type * as lib_utils from "../lib/utils.js";
import type * as periodStudentAccessCodes from "../periodStudentAccessCodes.js";
import type * as preferences from "../preferences.js";
import type * as questionTemplates from "../questionTemplates.js";
import type * as questions from "../questions.js";
import type * as rankings from "../rankings.js";
import type * as schemas_Assignment from "../schemas/Assignment.js";
import type * as schemas_Constraint from "../schemas/Constraint.js";
import type * as schemas_PeriodStudentAllowList from "../schemas/PeriodStudentAllowList.js";
import type * as schemas_Preference from "../schemas/Preference.js";
import type * as schemas_Question from "../schemas/Question.js";
import type * as schemas_QuestionTemplate from "../schemas/QuestionTemplate.js";
import type * as schemas_RankingEvent from "../schemas/RankingEvent.js";
import type * as schemas_SelectionPeriod from "../schemas/SelectionPeriod.js";
import type * as schemas_SelectionQuestion from "../schemas/SelectionQuestion.js";
import type * as schemas_StudentAnswer from "../schemas/StudentAnswer.js";
import type * as schemas_TeacherOnboarding from "../schemas/TeacherOnboarding.js";
import type * as schemas_TemplateQuestion from "../schemas/TemplateQuestion.js";
import type * as schemas_Topic from "../schemas/Topic.js";
import type * as schemas_TopicTeacherAllowList from "../schemas/TopicTeacherAllowList.js";
import type * as schemas_User from "../schemas/User.js";
import type * as selectionPeriods from "../selectionPeriods.js";
import type * as selectionQuestions from "../selectionQuestions.js";
import type * as share_admin_helpers from "../share/admin_helpers.js";
import type * as share_rankings from "../share/rankings.js";
import type * as share_selection_periods from "../share/selection_periods.js";
import type * as stats from "../stats.js";
import type * as studentAnswers from "../studentAnswers.js";
import type * as teacherOnboarding from "../teacherOnboarding.js";
import type * as templateQuestions from "../templateQuestions.js";
import type * as topicAnalytics from "../topicAnalytics.js";
import type * as topicTeacherAllowList from "../topicTeacherAllowList.js";
import type * as topics from "../topics.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  assignWithCPSAT: typeof assignWithCPSAT;
  assignmentSolver: typeof assignmentSolver;
  assignments: typeof assignments;
  constraints: typeof constraints;
  http: typeof http;
  "lib/congestion": typeof lib_congestion;
  "lib/slugGenerator": typeof lib_slugGenerator;
  "lib/utils": typeof lib_utils;
  periodStudentAccessCodes: typeof periodStudentAccessCodes;
  preferences: typeof preferences;
  questionTemplates: typeof questionTemplates;
  questions: typeof questions;
  rankings: typeof rankings;
  "schemas/Assignment": typeof schemas_Assignment;
  "schemas/Constraint": typeof schemas_Constraint;
  "schemas/PeriodStudentAllowList": typeof schemas_PeriodStudentAllowList;
  "schemas/Preference": typeof schemas_Preference;
  "schemas/Question": typeof schemas_Question;
  "schemas/QuestionTemplate": typeof schemas_QuestionTemplate;
  "schemas/RankingEvent": typeof schemas_RankingEvent;
  "schemas/SelectionPeriod": typeof schemas_SelectionPeriod;
  "schemas/SelectionQuestion": typeof schemas_SelectionQuestion;
  "schemas/StudentAnswer": typeof schemas_StudentAnswer;
  "schemas/TeacherOnboarding": typeof schemas_TeacherOnboarding;
  "schemas/TemplateQuestion": typeof schemas_TemplateQuestion;
  "schemas/Topic": typeof schemas_Topic;
  "schemas/TopicTeacherAllowList": typeof schemas_TopicTeacherAllowList;
  "schemas/User": typeof schemas_User;
  selectionPeriods: typeof selectionPeriods;
  selectionQuestions: typeof selectionQuestions;
  "share/admin_helpers": typeof share_admin_helpers;
  "share/rankings": typeof share_rankings;
  "share/selection_periods": typeof share_selection_periods;
  stats: typeof stats;
  studentAnswers: typeof studentAnswers;
  teacherOnboarding: typeof teacherOnboarding;
  templateQuestions: typeof templateQuestions;
  topicAnalytics: typeof topicAnalytics;
  topicTeacherAllowList: typeof topicTeacherAllowList;
  topics: typeof topics;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  aggregate: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
};
