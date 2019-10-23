import * as path from "path";

// List of filenames for icons
export abstract class LeoIcons {
    // 8=dirty, 4=cloned, 2=marked, 1=content
    static readonly icons: { light: string; dark: string; }[] = Array(16)
        .fill("")
        .map((_, p_index) => {
            return {
                light: path.join(__filename, "..", "..", "resources", "light", "box" + ("0" + p_index).slice(-2) + ".svg"),
                dark: path.join(__filename, "..", "..", "resources", "dark", "box" + ("0" + p_index).slice(-2) + ".svg")
            }
        });
}