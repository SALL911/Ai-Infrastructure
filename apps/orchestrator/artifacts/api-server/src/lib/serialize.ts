/**
 * Serialize DB results before Zod validation.
 * Converts Date objects → ISO strings so they match OpenAPI `string` types.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
