export function resolvePublicAssetUrl(path: string) {
  if (!path) {
    return path;
  }

  if (/^(?:https?:)?\/\//.test(path) || path.startsWith("/")) {
    return path;
  }

  return `/${path}`;
}
