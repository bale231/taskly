//
//  TodoEntity.swift
//  TasklyIntents
//
//  Rappresenta una singola todo come entità scegliibile da Siri. A
//  differenza di TodoListEntity — che legge dallo storage condiviso — qui
//  i dati arrivano dall'API: le todo cambiano di continuo e tenerne una
//  copia locale significherebbe proporre voci già completate o cancellate.
//
//  La scelta avviene per selezione, non per titolo dettato: il
//  riconoscimento vocale su testo libero sbaglia facilmente ("latte" per
//  "lattine") e qui l'errore si tradurrebbe nel completare la todo
//  sbagliata.
//

import AppIntents

struct TodoEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation { "ToDo" }
    static var defaultQuery = TodoQuery()

    let id: Int
    let title: String
    /// Nome della lista di provenienza: due liste diverse possono contenere
    /// todo omonime, e senza questo l'elenco proposto sarebbe ambiguo.
    let listName: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)", subtitle: "\(listName)")
    }
}

struct TodoQuery: EntityQuery {
    func entities(for identifiers: [TodoEntity.ID]) async throws -> [TodoEntity] {
        var found: [TodoEntity] = []
        for list in SharedStore.getTodoLists() {
            guard let todos = try? await TasklyAPI.fetchTodos(listId: list.id) else { continue }
            found.append(
                contentsOf: todos
                    .filter { identifiers.contains($0.id) }
                    .map { TodoEntity(id: $0.id, title: $0.title, listName: list.name) }
            )
        }
        return found
    }

    func suggestedEntities() async throws -> [TodoEntity] {
        []
    }
}
