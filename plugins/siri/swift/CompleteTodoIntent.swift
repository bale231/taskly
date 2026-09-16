//
//  CompleteTodoIntent.swift
//  TasklyIntents
//
//  "Completa una ToDo in Taskly": Siri chiede la lista, poi fa scegliere
//  fra le todo ancora da fare invece di farsi dettare il titolo — un titolo
//  dettato e riconosciuto male porterebbe a completare la todo sbagliata,
//  che è un errore silenzioso e fastidioso da recuperare.
//

import AppIntents

struct CompleteTodoIntent: AppIntent {
    static var title: LocalizedStringResource { "Completa ToDo" }
    static var description: IntentDescription {
        IntentDescription("Segna come completata una ToDo di una lista Taskly.")
    }

    @Parameter(title: "Lista", requestValueDialog: "In quale lista?")
    var list: TodoListEntity

    @Parameter(title: "ToDo", requestValueDialog: "Quale ToDo hai completato?")
    var todo: TodoEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Completa \(\.$todo) in \(\.$list)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            let pending = try await TasklyAPI.fetchTodos(listId: list.id).filter { !$0.completed }

            guard !pending.isEmpty else {
                return .result(dialog: "Non c'è niente da completare in \(list.name).")
            }

            // Se il parametro non è stato ancora risolto, Siri chiede qui
            // quale todo fra quelle davvero aperte in QUESTA lista: la
            // query dell'entità da sola non sa a quale lista si riferisce.
            let choices = pending.map {
                TodoEntity(id: $0.id, title: $0.title, listName: list.name)
            }
            let chosen = try await $todo.requestDisambiguation(
                among: choices,
                dialog: "Quale ToDo hai completato?"
            )

            try await TasklyAPI.toggleTodo(todoId: chosen.id)
            return .result(dialog: "Fatto: \(chosen.title).")
        } catch TasklyAPI.APIError.notAuthenticated {
            return .result(dialog: "Devi prima accedere all'app Taskly per usare Siri.")
        } catch {
            return .result(dialog: "Non sono riuscito a completare la ToDo. Riprova dall'app.")
        }
    }
}
