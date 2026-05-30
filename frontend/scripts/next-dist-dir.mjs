import path from "path";

const DEFAULT_DIST_DIR = ".next";

export const getResolvedNextDistDir = () => {
  const custom = process.env.NEXT_DIST_DIR;
  const projectRoot = process.cwd();

  if (custom && custom.trim()) {
    const resolved = path.resolve(projectRoot, custom.trim());
    const relative = path.relative(projectRoot, resolved);
    const escapesProject = relative.startsWith("..") || path.isAbsolute(relative);

    if (!escapesProject) {
      return resolved;
    }
  }

  return path.resolve(projectRoot, DEFAULT_DIST_DIR);
};

export const getNextDistDirForConfig = () => {
  const resolved = getResolvedNextDistDir();
  return path.relative(process.cwd(), resolved).replace(/\\/g, "/");
};
