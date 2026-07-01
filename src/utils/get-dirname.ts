export function getDirname(pathString: string): string {
  // Handles both forward slashes (Unix/URLs) and backslashes (Windows strings)
  const lastSlashIndex = Math.max(
    pathString.lastIndexOf('/'),
    pathString.lastIndexOf('\\')
  );

  if (lastSlashIndex === -1) return '.'; // No folder found, current directory
  if (lastSlashIndex === 0) return pathString[0]; // Root directory '/'

  return pathString.substring(0, lastSlashIndex);
}