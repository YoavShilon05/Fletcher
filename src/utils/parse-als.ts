import {readFile} from "@tauri-apps/plugin-fs";
import {gunzipSync} from "fflate";
import {XMLParser} from "fast-xml-parser";

export async function loadAls(path: string) {
  const bytes = await readFile(path); // Uint8Array

  const xml = new TextDecoder().decode(gunzipSync(bytes));

  const parser = new XMLParser({
    ignoreAttributes: false,
  });

  return parser.parse(xml);
}
