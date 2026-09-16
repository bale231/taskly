//
//  ReopenTodoIntent.swift
//  TasklyIntents
//
//  L'inverso di CompleteTodoIntent: rimette fra le cose da fare una todo
//  già completata, tipicamente perché era stata segnata per errore. Stesso
//  schema — si sceglie fra quelle completate invece di dettarne il titolo.
//

import AppIntents

struct ReopenTodoIntent: AppIntent {
    static var title: LocalizedStringResource { "Riapri ToDo" }
    static var description: IntentDescription {
        IntentDescription("Rimette fra le cose da fare una ToDo già completata.")
    }

    @Parameter(title: "Lista", requestValueDialog: "In quale lista?")
    var list: TodoListEntity

    @Parameter(title: "ToDo", requestValueDialog: "Quale ToDo vuoi riaprire?")
    var todo: TodoEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Riapri \(\.$todo) in \(\.$list)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            let completed = try await TasklyAPI.fetchTodos(listId: list.id).filter { $0.completed }

            guard !completed.isEmpty else {
                return .result(dialog: "In \(list.name) non c'è nessuna ToDo completata.")
            }

            let choices = completed.map {
                TodoEntity(id: $0.id, title: $0.title, listName: list.name)
            }
            let chosen = try await $todo.requestDisambiguation(
                among: choices,
                dialog: "Quale ToDo vuoi riaprire?"
            )

            try await TasklyAPI.toggleTodo(todoId: chosen.id)
            return .result(dialog: "Ho rimesso \(chosen.title) fra le cose da fare.")
        } catch TasklyAPI.APIError.notAuthenticated {
            return .result(dialog: "Devi prima accedere all'app Taskly per usare Siri.")
        } catch {
            return .result(dialog: "Non sono riuscito a riaprire la ToDo. Riprova dall'app.")
        }
    }
}
