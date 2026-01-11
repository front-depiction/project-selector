/******************************************************
 * GROUP ASSIGNMENT AST (Final Simplified Version)
 * - Hard constraints unchanged
 * - Soft constraints: values already 0–1
 * - Answers: number | boolean only
 ******************************************************/

/***************
 * AST Types
 ***************/

type Answers = Record<string, number | boolean>;

type Constraint =
  | HardConstraint
  | SoftConstraint
  | LogicalConstraint;

type HardConstraint = {
  kind: "hard";
  rule: HardRule;
};

type SoftConstraint = {
  kind: "soft";
  key: string; // question key
  mode: "attractive" | "repulsive";
  weight?: number; // default = 1
};

type LogicalConstraint = {
  kind: "logical";
  rule: LogicalRule;
};

type HardRule =
  | { op: "range"; key: string; min: number; max: number }
  | { op: "equals"; key: string; value: any }
  | { op: "includes"; key: string; value: any; min: number; max: number }
  | { op: "regex"; key: string; pattern: string }
  | LogicalRule;

type LogicalRule =
  | { op: "and"; rules: Constraint[] }
  | { op: "or"; rules: Constraint[] }
  | { op: "not"; rule: Constraint };

type Group = {
  id: string;
  members: Answers[];
};

/*************************
 * Boolean + Number unify to 0–1
 *************************/

function getNumericValue(v: number | boolean | undefined): number {
  if (v === undefined) return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  return Math.max(0, Math.min(1, v));
}

/*************************
 * HARD RULE EVALUATION
 *************************/

function evalHard(rule: HardRule, group: Group): boolean {
  switch (rule.op) {
    case "range": {
      const v = aggregateNumeric(group, rule.key);
      return v >= rule.min && v <= rule.max;
    }

    case "equals": {
      const v = aggregateNumeric(group, rule.key);
      return v === rule.value;
    }

    case "includes": {
      const values = group.members.map((m) => m[rule.key]);
      const count = values.filter((v) => v === rule.value).length;
      return count >= rule.min && count <= rule.max;
    }

    case "regex": {
      const text = group.members
        .map((m) => String(m[rule.key] ?? ""))
        .join(" ");
      return new RegExp(rule.pattern).test(text);
    }

    case "and":
      return rule.rules.every((c) => evalConstraint(c, group).hardPass);

    case "or":
      return rule.rules.some((c) => evalConstraint(c, group).hardPass);

    case "not":
      return !evalConstraint(rule.rule, group).hardPass;
  }
}

/*************************
 * SOFT SCORE LOGIC
 *
 * Values are already in 0–1.
 *
 * attractive → maximize similarity
 * repulsive  → maximize difference
 *************************/

function evalSoft(c: SoftConstraint, group: Group): number {
  const vals = group.members.map((m) => getNumericValue(m[c.key]));

  if (vals.length < 2) return 1;

  const distances: number[] = [];
  for (let i = 0; i < vals.length; i++) {
    for (let j = i + 1; j < vals.length; j++) {
      distances.push(Math.abs(vals[i] - vals[j]));
    }
  }

  const avgDist =
    distances.reduce((a, b) => a + b, 0) / distances.length;

  const base =
    c.mode === "attractive"
      ? 1 - avgDist // close together is good
      : avgDist;    // far apart is good

  return base * (c.weight ?? 1);
}

/*************************
 * FULL CONSTRAINT EVALUATION
 *************************/

function evalConstraint(c: Constraint, group: Group) {
  if (c.kind === "hard") {
    return { hardPass: evalHard(c.rule, group), softScore: 0 };
  }
  if (c.kind === "soft") {
    return {
      hardPass: true,
      softScore: evalSoft(c, group),
    };
  }
  if (c.kind === "logical") {
    return {
      hardPass: evalHard(c.rule, group),
      softScore: evalSoftLogical(c.rule, group),
    };
  }
  throw new Error("Unknown constraint kind");
}

/*************************
 * LOGICAL SOFT COMBINATORS
 *************************/

function evalSoftLogical(rule: LogicalRule, group: Group): number {
  switch (rule.op) {
    case "and":
      return rule.rules
        .map((c) => evalConstraint(c, group).softScore)
        .reduce((a, b) => a * b, 1);

    case "or":
      return rule.rules
        .map((c) => evalConstraint(c, group).softScore)
        .reduce((a, b) => Math.max(a, b), 0);

    case "not":
      return 1 - evalConstraint(rule.rule, group).softScore;
  }
}

/*************************
 * HELPER: aggregate numeric
 *************************/

function aggregateNumeric(group: Group, key: string): number {
  return group.members.reduce(
    (acc, m) => acc + getNumericValue(m[key]),
    0
  );
}

/*************************
 * DEMO
 *************************/

const groupA: Group = {
  id: "A",
  members: [
    { q1: 0.2, q2: true },
    { q1: 0.8, q2: false },
    { q1: 0.6, q2: true },
  ],
};

// Hard: exactly one "true" for q2
const hardExactlyOneTrue: HardConstraint = {
  kind: "hard",
  rule: { op: "includes", key: "q2", value: true, min: 1, max: 1 },
};

// Soft: attractive on q1
const softAttractiveQ1: SoftConstraint = {
  kind: "soft",
  key: "q1",
  mode: "attractive",
};

// Soft: repulsive on q2
const softRepulsiveQ2: SoftConstraint = {
  kind: "soft",
  key: "q2",
  mode: "repulsive",
  weight: 0.5,
};

const combined: LogicalConstraint = {
  kind: "logical",
  rule: {
    op: "and",
    rules: [softAttractiveQ1, softRepulsiveQ2],
  },
};

console.log("Hard:", evalConstraint(hardExactlyOneTrue, groupA));
console.log("Soft q1 attractive:", evalConstraint(softAttractiveQ1, groupA));
console.log("Soft q2 repulsive:", evalConstraint(softRepulsiveQ2, groupA));
console.log("Combined soft:", evalConstraint(combined, groupA));
