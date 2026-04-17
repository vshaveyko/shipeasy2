import { z } from "zod";
import { ApiError } from "@shipeasy/core";
import { authenticateAdmin, errorResponse, type AdminIdentity } from "../admin-auth";

export async function withAdmin(
  req: Request,
  handler: (identity: AdminIdentity) => Promise<unknown>,
): Promise<Response> {
  try {
    const identity = await authenticateAdmin(req);
    const body = await handler(identity);
    return Response.json(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation failed", issues: err.issues }, { status: 422 });
    }
    if (err instanceof ApiError) {
      return Response.json(
        { error: err.message, ...(err.code ? { code: err.code } : {}) },
        { status: err.status },
      );
    }
    return errorResponse(err);
  }
}

export async function withAdminCreated(
  req: Request,
  handler: (identity: AdminIdentity) => Promise<unknown>,
): Promise<Response> {
  try {
    const identity = await authenticateAdmin(req);
    const body = await handler(identity);
    return Response.json(body, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Validation failed", issues: err.issues }, { status: 422 });
    }
    if (err instanceof ApiError) {
      return Response.json(
        { error: err.message, ...(err.code ? { code: err.code } : {}) },
        { status: err.status },
      );
    }
    return errorResponse(err);
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
}
