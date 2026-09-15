import ExpoModulesCore

// Stessa chiave/gruppo di ios/TasklyIntents/SharedStore.swift: questo
// modulo è il lato "scrittura" da RN, l'estensione Siri è il lato
// "lettura". Le chiavi devono restare identiche tra i due file.
private let appGroupId = "group.com.bale231.taskly"
private let listsKey = "siri.todoLists"
private let accessTokenKey = "siri.accessToken"
private let refreshTokenKey = "siri.refreshToken"

public class SiriSharedStorageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SiriSharedStorage")

    Function("isAvailable") { () -> Bool in
      UserDefaults(suiteName: appGroupId) != nil
    }

    // `lists` è un array di {id, name} già serializzato lato JS: qui viene
    // ri-codificato in JSON per matchare esattamente [TodoListRecord]
    // (Codable) letto da SharedStore.swift nell'estensione.
    Function("setTodoLists") { (lists: [[String: Any]]) in
      guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
      guard let data = try? JSONSerialization.data(withJSONObject: lists) else { return }
      defaults.set(data, forKey: listsKey)
    }

    Function("setTokens") { (accessToken: String, refreshToken: String) in
      guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
      defaults.set(accessToken, forKey: accessTokenKey)
      defaults.set(refreshToken, forKey: refreshTokenKey)
    }

    Function("clearTokens") {
      guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
      defaults.removeObject(forKey: accessTokenKey)
      defaults.removeObject(forKey: refreshTokenKey)
    }
  }
}
