import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const SPEC_URL = new URL('../openapi.yaml', import.meta.url);
const RAW_SPEC = readFileSync(SPEC_URL, 'utf-8');
const OPENAPI = JSON.parse(RAW_SPEC);

function withCorsHeaders(headers = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    ...headers
  };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(
    statusCode,
    withCorsHeaders({
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(body),
      ...extraHeaders
    })
  );
  res.end(body);
}

function sendNoContent(res, statusCode = 204) {
  res.writeHead(statusCode, withCorsHeaders());
  res.end();
}

function resolvePointer(root, pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('#/')) {
    return undefined;
  }

  return pointer
    .slice(2)
    .split('/')
    .reduce((current, segment) => {
      if (current === undefined || current === null) {
        return undefined;
      }

      const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
      return current[key];
    }, root);
}

function dereference(value) {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value.$ref && typeof value.$ref === 'string') {
    return resolvePointer(OPENAPI, value.$ref);
  }

  return value;
}

function resolveExample(exampleRefOrObject) {
  const example = dereference(exampleRefOrObject);
  if (!example || typeof example !== 'object') {
    return undefined;
  }

  if (Object.hasOwn(example, 'value')) {
    return example.value;
  }

  return undefined;
}

function pickJsonExample(response) {
  const resolved = dereference(response);
  const content = resolved?.content?.['application/json'];
  if (!content) {
    return undefined;
  }

  if (Object.hasOwn(content, 'example')) {
    return content.example;
  }

  if (content.examples && typeof content.examples === 'object') {
    const first = Object.values(content.examples)[0];
    return resolveExample(first);
  }

  return undefined;
}

function pickResponse(operation) {
  const responses = operation?.responses;
  if (!responses || typeof responses !== 'object') {
    return {
      statusCode: 500,
      body: {
        error: {
          code: 'MOCK_CONFIGURATION_ERROR',
          message: 'Operation has no responses in the OpenAPI spec.'
        }
      }
    };
  }

  const preferred = ['200', '201', '202', '204', 'default'];
  let responseKey = preferred.find((candidate) => Object.hasOwn(responses, candidate));

  if (!responseKey) {
    responseKey = Object.keys(responses)[0];
  }

  const response = responses[responseKey];
  const statusCode = responseKey === 'default' ? 200 : Number(responseKey);
  const body = pickJsonExample(response);
  return { statusCode, body };
}

function buildNotFound(requestId) {
  const fallback = {
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found.',
      requestId
    }
  };

  const notFoundResponse = OPENAPI?.components?.responses?.NotFound;
  const example = pickJsonExample(notFoundResponse);
  if (!example) {
    return fallback;
  }

  const copy = structuredClone(example);
  if (copy?.error && typeof copy.error === 'object') {
    copy.error.requestId = requestId;
  }

  return copy;
}

const server = createServer((req, res) => {
  const requestId = randomUUID();

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  if (!req.url) {
    sendJson(res, 400, {
      error: {
        code: 'BAD_REQUEST',
        message: 'Request URL is missing.',
        requestId
      }
    });
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const method = (req.method || 'GET').toLowerCase();

  if (method === 'get' && url.pathname === '/openapi.yaml') {
    res.writeHead(
      200,
      withCorsHeaders({
        'content-type': 'application/yaml; charset=utf-8',
        'content-length': Buffer.byteLength(RAW_SPEC)
      })
    );
    res.end(RAW_SPEC);
    return;
  }

  const operation = OPENAPI?.paths?.[url.pathname]?.[method];
  if (!operation) {
    sendJson(res, 404, buildNotFound(requestId));
    return;
  }

  const { statusCode, body } = pickResponse(operation);
  const headers = { 'x-mock-request-id': requestId, 'x-mock-source': 'openapi-example' };

  if (statusCode === 204) {
    sendNoContent(res, 204);
    return;
  }

  if (body === undefined) {
    sendJson(
      res,
      statusCode,
      {
        error: {
          code: 'MOCK_EXAMPLE_MISSING',
          message: 'No application/json example configured for this operation response.',
          requestId
        }
      },
      headers
    );
    return;
  }

  const payload = structuredClone(body);
  if (payload?.error && typeof payload.error === 'object') {
    payload.error.requestId = requestId;
  }

  sendJson(res, statusCode, payload, headers);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`OpenAPI mock server listening on http://localhost:${PORT}`);
});
