import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = Record<string, unknown>;

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/", (c) => c.text("ShipEasy Worker"));

export default app;
