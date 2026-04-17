import { describe, it, expect } from "vitest";
import { ApiError } from "../errors";

describe("ApiError", () => {
  it("is an instance of Error", () => {
    const err = new ApiError("test message", 400);
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of ApiError", () => {
    expect(new ApiError("msg", 400)).toBeInstanceOf(ApiError);
  });

  it("sets name to 'ApiError'", () => {
    expect(new ApiError("msg", 400).name).toBe("ApiError");
  });

  it("sets the message", () => {
    expect(new ApiError("something went wrong", 500).message).toBe("something went wrong");
  });

  it("sets the status code", () => {
    expect(new ApiError("not found", 404).status).toBe(404);
    expect(new ApiError("rate limited", 429).status).toBe(429);
  });

  it("sets the optional code when provided", () => {
    const err = new ApiError("limit exceeded", 429, "LIMIT_EXCEEDED");
    expect(err.code).toBe("LIMIT_EXCEEDED");
  });

  it("leaves code undefined when not provided", () => {
    expect(new ApiError("msg", 400).code).toBeUndefined();
  });

  it("can be caught as a generic Error", () => {
    const fn = () => {
      throw new ApiError("oops", 500);
    };
    expect(fn).toThrowError("oops");
  });
});
