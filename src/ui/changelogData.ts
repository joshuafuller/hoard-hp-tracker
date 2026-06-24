import raw from "../../CHANGELOG.md?raw";
import { parseChangelog, type ChangelogEntry } from "./changelog";

/** The bundled, parsed changelog — offline, no fetch (#209). */
export const CHANGELOG: ChangelogEntry[] = parseChangelog(raw);
