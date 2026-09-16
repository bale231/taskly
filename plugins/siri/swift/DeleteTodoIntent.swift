//
//  DeleteTodoIntent.swift
//  TasklyIntents
//
//  "Elimina una ToDo in Taskly". A differenza di completare — che è
//  reversibile con "riapri" — qui il dato sparisce, quindi si chiede
//  conferma esplicita prima di procedere.
//

import AppIntents

struct DeleteTodoIntent: AppIntent {
    static var title: LocalizedStringResource { "Elimina ToDo" }
    static var description: IntentDescription {
        IntentDescription("Elimina definitivamente una ToDo da una lista Taskly.")
    }

    @Parameter(title: "Lista", requestValueDialog: "In quale lista?")
    var list: TodoListEntity

    @Parameter(title: "ToDo", requestValueDialog: "Quale ToDo vuoi eliminare?")
    var todo: TodoEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Elimina \(\.$todo) da \(\.$list)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            let todos = try await TasklyAPI.fetchTodos(listId: list.id)

            guard !todos.isEmpty else {
                return .result(dialog: "In \(list.name) non c'è nessuna ToDo.")
            }

            let choices = todos.map {
                TodoEntity(id: $0.id, title: $0.title, listName: list.name)
            }
            let chosen = try await $todo.requestDisambiguation(
                among: choices,
                dialog: "Quale ToDo vuoi eliminare?"
            )

            // L'eliminazione è definitiva: si chiede conferma prima di
            // toccare il server. `requestConfirmation` interrompe l'intent
            // se l'utente rifiuta, quindi sotto si arriva solo con un sì.
            try await requestConfirmation(
                result: .result(dialog: "Vuoi davvero eliminare \(chosen.title)?")
            )

            try await TasklyAPI.deleteTodo(todoId: chosen.id)
            return .result(dialog: "Ho eliminato \(chosen.title).")
        } catch TasklyAPI.APIError.notAuthenticated {
            return .result(dialog: "Devi prima accedere all'app Taskly per usare Siri.")
        } catch {
            return .result(dialog: "Non sono riuscito a eliminare la ToDo. Riprova dall'app.")
        }
    }
}
