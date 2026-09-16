//
//  ReadTodosIntent.swift
//  TasklyIntents
//
//  "Cosa c'è nella lista <lista> di Taskly": legge a voce le todo ancora
//  da fare. Le completate sono escluse: chi chiede cosa c'è in una lista
//  vuole sapere cosa gli resta da fare, non cosa ha già fatto.
//

import AppIntents

struct ReadTodosIntent: AppIntent {
    static var title: LocalizedStringResource { "Leggi ToDo" }
    static var description: IntentDescription {
        IntentDescription("Legge le ToDo ancora da fare di una lista Taskly.")
    }

    @Parameter(title: "Lista", requestValueDialog: "Di quale lista?")
    var list: TodoListEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Leggi le ToDo di \(\.$list)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            let pending = try await TasklyAPI.fetchTodos(listId: list.id).filter { !$0.completed }

            guard !pending.isEmpty else {
                return .result(dialog: "Non c'è niente da fare in \(list.name).")
            }

            // Oltre una certa quantità un elenco letto a voce diventa
            // inascoltabile: se ne leggono alcune e si dice quante restano.
            let spoken = pending.prefix(ReadTodosIntent.maxSpokenTodos)
            let titles = spoken.map(\.title).joined(separator: ", ")
            let remaining = pending.count - spoken.count

            if remaining > 0 {
                let others = remaining == 1 ? "un'altra" : "altre \(remaining)"
                return .result(dialog: "In \(list.name): \(titles), e \(others).")
            }
            return .result(dialog: "In \(list.name): \(titles).")
        } catch TasklyAPI.APIError.notAuthenticated {
            return .result(dialog: "Devi prima accedere all'app Taskly per usare Siri.")
        } catch {
            return .result(dialog: "Non sono riuscito a leggere la lista. Riprova dall'app.")
        }
    }

    private static let maxSpokenTodos = 5
}
