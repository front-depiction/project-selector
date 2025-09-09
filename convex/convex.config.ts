import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";

const app = defineApp();

// Single aggregate for topic metrics
app.use(aggregate);

export default app;