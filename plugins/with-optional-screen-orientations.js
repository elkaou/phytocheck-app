const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Google Play déduit parfois android.hardware.screen.portrait d'une activité
 * Android verrouillée en portrait, même lorsque Expo utilise orientation:
 * "default". Ces déclarations explicites indiquent que les deux orientations
 * sont supportées mais qu'aucune n'est une exigence matérielle.
 */
module.exports = function withOptionalScreenOrientations(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const manifest = manifestConfig.modResults.manifest;
    const features = Array.isArray(manifest["uses-feature"])
      ? manifest["uses-feature"]
      : [];

    const optionalFeatures = [
      "android.hardware.screen.portrait",
      "android.hardware.screen.landscape",
    ];

    for (const featureName of optionalFeatures) {
      const existing = features.find(
        (feature) => feature?.$?.["android:name"] === featureName,
      );

      if (existing) {
        existing.$["android:required"] = "false";
      } else {
        features.push({
          $: {
            "android:name": featureName,
            "android:required": "false",
          },
        });
      }
    }

    manifest["uses-feature"] = features;
    return manifestConfig;
  });
};
