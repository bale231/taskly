const fs = require("fs");
const path = require("path");
const { withXcodeProject, withDangerousMod, IOSConfig } = require("@expo/config-plugins");

/**
 * Ricrea a ogni prebuild il target dell'estensione App Intents che espone
 * Taskly a Siri.
 *
 * Serve perché `ios/` è in .gitignore: EAS compila in cloud partendo dal
 * repo ed esegue prebuild da zero, quindi un target creato a mano in Xcode
 * su una singola macchina non esisterebbe mai lì (ed è già andato perso una
 * volta con `prebuild --clean`). I sorgenti Swift vivono in
 * plugins/siri/swift/ — versionati — e vengono copiati dentro ios/ qui.
 */

const TARGET_NAME = "TasklyIntents";
const APP_GROUP = "group.com.bale231.taskly";
const DEPLOYMENT_TARGET = "26.0";

const withSiriExtension = (config) => {
  config = withExtensionFiles(config);
  config = withExtensionTarget(config);
  return config;
};

/** Copia sorgenti Swift, Info.plist ed entitlements dentro ios/<target>/. */
const withExtensionFiles = (config) =>
  withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const targetDir = path.join(iosRoot, TARGET_NAME);
      const swiftSrc = path.join(projectRoot, "plugins", "siri", "swift");

      fs.mkdirSync(targetDir, { recursive: true });

      for (const file of fs.readdirSync(swiftSrc)) {
        if (file.endsWith(".swift")) {
          fs.copyFileSync(path.join(swiftSrc, file), path.join(targetDir, file));
        }
      }

      // L'estensione dichiara di essere un App Intents extension point:
      // senza questo Siri non la carica affatto. Le chiavi di bundle
      // (identifier, nome, versioni) vanno dichiarate esplicitamente con i
      // riferimenti alle build settings: Xcode non le inietta da sé in un
      // Info.plist scritto a mano, e senza CFBundleIdentifier la build
      // fallisce con "Embedded binary's bundle identifier is not prefixed
      // with the parent app's bundle identifier".
      fs.writeFileSync(
        path.join(targetDir, "Info.plist"),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>$(DEVELOPMENT_LANGUAGE)</string>
\t<key>CFBundleDisplayName</key>
\t<string>${TARGET_NAME}</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundleIdentifier</key>
\t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundlePackageType</key>
\t<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
\t<key>CFBundleShortVersionString</key>
\t<string>$(MARKETING_VERSION)</string>
\t<key>CFBundleVersion</key>
\t<string>$(CURRENT_PROJECT_VERSION)</string>
\t<key>EXAppExtensionAttributes</key>
\t<dict>
\t\t<key>EXExtensionPointIdentifier</key>
\t\t<string>com.apple.appintents-extension</string>
\t</dict>
</dict>
</plist>
`
      );

      // Stesso App Group dell'app: è il canale da cui l'estensione legge
      // liste e token JWT (vedi SharedStore.swift e src/services/siriSync.ts).
      fs.writeFileSync(
        path.join(targetDir, `${TARGET_NAME}.entitlements`),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.security.application-groups</key>
\t<array>
\t\t<string>${APP_GROUP}</string>
\t</array>
</dict>
</plist>
`
      );

      return cfg;
    },
  ]);

/** Registra il target nel .pbxproj con build phase, configurazioni e file. */
const withExtensionTarget = (config) =>
  withXcodeProject(config, (cfg) => {
    const proj = cfg.modResults;

    // Il prebuild può girare su un progetto che ha già il target (rerun
    // senza --clean): in quel caso non va duplicato.
    const existing = proj.pbxTargetByName(TARGET_NAME);
    if (existing) return cfg;

    const bundleId = `${cfg.ios.bundleIdentifier}.${TARGET_NAME}`;
    const marketingVersion = cfg.version;

    const target = proj.addTarget(TARGET_NAME, "app_extension", TARGET_NAME, bundleId);

    proj.addBuildPhase([], "PBXSourcesBuildPhase", "Sources", target.uuid);
    proj.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", target.uuid);
    proj.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", target.uuid);

    const group = proj.addPbxGroup(
      [
        ...fs
          .readdirSync(path.join(cfg.modRequest.platformProjectRoot, TARGET_NAME))
          .filter((f) => f.endsWith(".swift")),
        "Info.plist",
      ],
      TARGET_NAME,
      TARGET_NAME
    );

    // Appende il gruppo alla radice del progetto, così i file compaiono in
    // Xcode invece di esistere solo su disco.
    const groups = proj.hash.project.objects["PBXGroup"];
    for (const key of Object.keys(groups)) {
      if (groups[key].name === undefined && groups[key].path === undefined && groups[key].children) {
        groups[key].children.push({ value: group.uuid, comment: TARGET_NAME });
        break;
      }
    }

    // Solo il nome del file, senza il prefisso della cartella: il gruppo ha
    // già `path: TasklyIntents`, e anteporlo di nuovo produce percorsi
    // doppi (TasklyIntents/TasklyIntents/File.swift) che xcodebuild non
    // trova.
    for (const file of fs
      .readdirSync(path.join(cfg.modRequest.platformProjectRoot, TARGET_NAME))
      .filter((f) => f.endsWith(".swift"))) {
      proj.addSourceFile(file, { target: target.uuid }, group.uuid);
    }

    const configurations = proj.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const buildSettings = configurations[key].buildSettings;
      if (!buildSettings || buildSettings.PRODUCT_NAME !== `"${TARGET_NAME}"`) continue;

      buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}"`;
      buildSettings.INFOPLIST_FILE = `"${TARGET_NAME}/Info.plist"`;
      buildSettings.CODE_SIGN_ENTITLEMENTS = `"${TARGET_NAME}/${TARGET_NAME}.entitlements"`;
      buildSettings.CODE_SIGN_STYLE = "Automatic";
      buildSettings.SWIFT_VERSION = "5.0";
      buildSettings.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
      buildSettings.TARGETED_DEVICE_FAMILY = `"1,2"`;
      buildSettings.SKIP_INSTALL = "NO";
      // Apple rifiuta la build se la versione dell'estensione non combacia
      // con quella dell'app: qui è sempre quella di app.json, così non c'è
      // più niente da allineare a mano a ogni release.
      buildSettings.MARKETING_VERSION = marketingVersion;
      buildSettings.CURRENT_PROJECT_VERSION = "1";
      if (cfg.ios.appleTeamId) {
        buildSettings.DEVELOPMENT_TEAM = cfg.ios.appleTeamId;
      }
    }

    // L'.appex viene incorporato nel bundle dalla fase "Copy Files" che
    // addTarget crea gia' da se' (dstSubfolderSpec 13 = PlugIns, con dentro
    // il prodotto dell'estensione): aggiungerne una seconda identica fa
    // fallire la build con "Unexpected duplicate tasks", perche' due fasi
    // copiano lo stesso file nella stessa destinazione.
    //
    // Serve pero' la dipendenza fra i target, che non c'e': senza,
    // xcodebuild non costruisce l'estensione prima dell'app e la fase non
    // trova alcun .appex da copiare — il bundle esce senza PlugIns e per
    // Siri l'estensione non esiste. Le due sezioni vanno create a mano se
    // assenti: un progetto Expo appena generato non ha dipendenze fra
    // target, e addTargetDependency scrive dentro sezioni che da' per
    // esistenti, fallendo in silenzio.
    const appTarget = proj.getFirstTarget();
    const objects = proj.hash.project.objects;
    objects.PBXTargetDependency = objects.PBXTargetDependency || {};
    objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};
    proj.addTargetDependency(appTarget.uuid, [target.uuid]);

    return cfg;
  });

module.exports = withSiriExtension;
