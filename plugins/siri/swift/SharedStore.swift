//
//  SharedStore.swift
//  TasklyIntents
//
//  Accesso allo storage condiviso (App Group) tra l'app principale RN e
//  questa estensione: liste esistenti (per far scegliere una lista a Siri)
//  e i token JWT (per autenticare le chiamate API anche ad app chiusa).
//
//  L'app RN scrive questi valori in UserDefaults(suiteName:) ogni volta che
//  cambiano (liste, login/refresh token) — vedi src/services/siriSync.ts e
//  modules/siri-shared-storage/ios/SiriSharedStorageModule.swift.
//

import Foundation

enum SharedStore {
    static let appGroupId = "group.com.bale231.taskly"
    static let apiBaseURL = "https://bale231.pythonanywhere.com/api"

    private static let listsKey = "siri.todoLists"
    private static let accessTokenKey = "siri.accessToken"
    private static let refreshTokenKey = "siri.refreshToken"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupId)
    }

    struct TodoListRecord: Codable {
        let id: Int
        let name: String
    }

    static func getTodoLists() -> [TodoListRecord] {
        guard let data = defaults?.data(forKey: listsKey) else { return [] }
        return (try? JSONDecoder().decode([TodoListRecord].self, from: data)) ?? []
    }

    static func setTodoLists(_ lists: [TodoListRecord]) {
        guard let data = try? JSONEncoder().encode(lists) else { return }
        defaults?.set(data, forKey: listsKey)
    }

    static func getAccessToken() -> String? {
        defaults?.string(forKey: accessTokenKey)
    }

    static func getRefreshToken() -> String? {
        defaults?.string(forKey: refreshTokenKey)
    }

    static func setTokens(access: String, refresh: String) {
        defaults?.set(access, forKey: accessTokenKey)
        defaults?.set(refresh, forKey: refreshTokenKey)
    }

    static func clearTokens() {
        defaults?.removeObject(forKey: accessTokenKey)
        defaults?.removeObject(forKey: refreshTokenKey)
    }
}
