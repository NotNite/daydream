import path from "node:path";

export function getDaydreamDir() {
  // TODO: windows only lol
  return path.join(process.env.APPDATA, "daydream");
}

export function getWorkDir() {
  return path.join(getDaydreamDir(), "work");
}
