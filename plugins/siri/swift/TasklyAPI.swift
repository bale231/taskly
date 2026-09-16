//
//  TasklyAPI.swift
//  TasklyIntents
//
//  Replica in Swift della logica di src/api/todos.ts (createTodo) e
//  src/api/auth.ts (refreshTokenIfNeeded): stesso endpoint, stesso schema
//  di retry-on-401. L'estensione non condivide processo con RN, quindi la
//  richiesta va rifatta qui invece di poter chiamare del codice JS.
//

import Foundation

enum TasklyAPI {
    enum APIError: Error {
        case notAuthenticated
        case requestFailed(Int)
    }

    static func createTodo(title: String, listId: Int) async throws {
        let url = URL(string: "\(SharedStore.apiBaseURL)/lists/\(listId)/todos/")!
        _ = try await send(url: url, method: "POST", body: try JSONEncoder().encode(["title": title]))
    }

    /// Replica createList di src/api/todos.ts: POST /lists/ con name+color.
    /// Restituisce la lista creata, così l'intent può confermare a voce il
    /// nome così come il server l'ha salvato.
    static func createList(name: String, color: String) async throws -> TodoListPayload {
        let url = URL(string: "\(SharedStore.apiBaseURL)/lists/")!
        let body = try JSONEncoder().encode(["name": name, "color": color])
        let data = try await send(url: url, method: "POST", body: body)
        return try JSONDecoder().decode(TodoListPayload.self, from: data)
    }

    /// Inverte lo stato completata/da fare di una todo. Stesso endpoint di
    /// toggleTodo lato RN: è il server a fare lo switch, qui non si manda
    /// alcuno stato desiderato.
    static func toggleTodo(todoId: Int) async throws {
        let url = URL(string: "\(SharedStore.apiBaseURL)/todos/\(todoId)/toggle/")!
        _ = try await send(url: url, method: "PATCH", body: nil)
    }

    /// Todo di una lista, per la lettura a voce. Il dettaglio lista è lo
    /// stesso endpoint usato da fetchListDetails lato RN.
    static func fetchTodos(listId: Int) async throws -> [TodoPayload] {
        let url = URL(string: "\(SharedStore.apiBaseURL)/lists/\(listId)/")!
        let data = try await send(url: url, method: "GET", body: nil)
        return try JSONDecoder().decode(ListDetailsPayload.self, from: data).todos
    }

    struct TodoListPayload: Decodable {
        let id: Int
        let name: String
    }

    struct TodoPayload: Decodable {
        let id: Int
        let title: String
        let completed: Bool
    }

    private struct ListDetailsPayload: Decodable {
        let todos: [TodoPayload]
    }

    // MARK: - Interni

    /// Esegue la richiesta gestendo il retry-on-401 in un punto solo, e
    /// restituisce il corpo della risposta (serve a chi deve decodificarlo;
    /// chi non ne ha bisogno lo ignora).
    private static func send(url: URL, method: String, body: Data?) async throws -> Data {
        guard SharedStore.getAccessToken() != nil else {
            throw APIError.notAuthenticated
        }

        let (data, res) = try await performRequest(url: url, method: method, body: body)

        if res.statusCode == 401 {
            guard try await refreshAccessToken() else {
                throw APIError.notAuthenticated
            }
            let (retryData, retryRes) = try await performRequest(url: url, method: method, body: body)
            guard (200..<300).contains(retryRes.statusCode) else {
                throw APIError.requestFailed(retryRes.statusCode)
            }
            return retryData
        }

        guard (200..<300).contains(res.statusCode) else {
            throw APIError.requestFailed(res.statusCode)
        }
        return data
    }

    private static func performRequest(
        url: URL,
        method: String,
        body: Data?
    ) async throws -> (Data, HTTPURLResponse) {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = SharedStore.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.requestFailed(-1)
        }
        return (data, httpResponse)
    }

    /// Stessa semantica di refreshTokenIfNeeded lato RN: usa il refresh
    /// token per ottenerne uno nuovo, e lo salva nello storage condiviso
    /// così anche la prossima apertura dell'app RN lo trova già aggiornato.
    private static func refreshAccessToken() async throws -> Bool {
        guard let refreshToken = SharedStore.getRefreshToken() else { return false }

        let url = URL(string: "\(SharedStore.apiBaseURL)/token/refresh/")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["refresh": refreshToken])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            SharedStore.clearTokens()
            return false
        }

        struct RefreshResponse: Decodable {
            let access: String
            let refresh: String?
        }
        let decoded = try JSONDecoder().decode(RefreshResponse.self, from: data)
        SharedStore.setTokens(access: decoded.access, refresh: decoded.refresh ?? refreshToken)
        return true
    }
}
