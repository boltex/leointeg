import * as path from "path";

// List of filenames for icons
export abstract class LeoIcons {
  // 8=dirty, 4=cloned, 2=marked, 1=content
  static readonly icons: string[] = Array(16)
    .fill("")
    .map((_, index) => path.join(__filename, "..", "..", "resources", "box" + ("0" + index).slice(-2) + ".svg"));
}