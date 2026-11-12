import { readFile, writeFile } from "node:fs/promises";

const manifestPath = new URL("../android-twa/twa-manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

// Android Browser Helper 2.7.x requires API 24; the Bubblewrap default is older.
manifest.minSdkVersion = 24;

// BR3 Tech does not use Google Play Billing / Digital Goods API.
if (manifest.features?.playBilling) {
  manifest.features.playBilling.enabled = false;
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("TWA configuration set to minSdkVersion 24; Play Billing disabled.");
