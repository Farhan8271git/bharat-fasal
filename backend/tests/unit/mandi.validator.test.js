import test from "node:test";
import assert from "node:assert/strict";
import { validateMandiQuery } from "../../src/modules/mandi/mandi.validator.js";

const executeValidator = (query) => {
  const req = { query };
  let nextCalled = false;

  const res = {
    statusCode: null,
    responseBody: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.responseBody = body;
      return this;
    },
  };

  validateMandiQuery(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
};

test("uses default limit when no limit is provided", () => {
  const { req, nextCalled } = executeValidator({});

  assert.equal(nextCalled, true);
  assert.deepEqual(req.validatedQuery, { limit: 20 });
});

test("accepts a valid limit", () => {
  const { req, nextCalled } = executeValidator({ limit: "5" });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.validatedQuery, { limit: 5 });
});

test("accepts maximum supported limit", () => {
  const { req, nextCalled } = executeValidator({ limit: "1000" });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.validatedQuery, { limit: 1000 });
});

const invalidLimits = [
  ["zero", "0"],
  ["negative", "-5"],
  ["non-numeric", "abc"],
  ["above maximum", "1001"],
  ["decimal", "5.5"],
];

for (const [description, limit] of invalidLimits) {
  test(`rejects ${description} limit`, () => {
    const { res, nextCalled } = executeValidator({ limit });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.equal(res.responseBody.success, false);
  });
}