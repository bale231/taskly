//
//  TodoListEntity.swift
//  TasklyIntents
//
//  Rappresenta una lista Taskly esistente come entità risolvibile da Siri:
//  quando l'utente dice "aggiungi <titolo> a <lista>", Siri usa questa query
//  per proporre/disambiguare tra le liste reali dell'utente, lette dallo
//  storage condiviso (App Group) che l'app RN tiene aggiornato.
//

import AppIntents

struct TodoListEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Lista Taskly" }
    static var defaultQuery = TodoListQuery()

    let id: Int
    let name: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct TodoListQuery: EntityStringQuery {
    func entities(for identifiers: [TodoListEntity.ID]) async throws -> [TodoListEntity] {
        let lists = SharedStore.getTodoLists()
        return lists
            .filter { identifiers.contains($0.id) }
            .map { TodoListEntity(id: $0.id, name: $0.name) }
    }

    func suggestedEntities() async throws -> [TodoListEntity] {
        SharedStore.getTodoLists().map { TodoListEntity(id: $0.id, name: $0.name) }
    }

    func entities(matching string: String) async throws -> [TodoListEntity] {
        let lowered = string.lowercased()
        return SharedStore.getTodoLists()
            .filter { $0.name.lowercased().contains(lowered) }
            .map { TodoListEntity(id: $0.id, name: $0.name) }
    }
}
