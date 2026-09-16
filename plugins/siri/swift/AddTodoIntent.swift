//
//  AddTodoIntent.swift
//  TasklyIntents
//
//  "Aggiungi <titolo> a <lista> in Taskly": crea un todo direttamente via
//  API, senza aprire l'app né passare da React Native — l'estensione gira
//  nel proprio processo (anche ad app chiusa) e usa i token JWT condivisi
//  via App Group (vedi SharedStore.swift) per autenticarsi.
//

import AppIntents

struct AddTodoIntent: AppIntent {
    static var title: LocalizedStringResource { "Aggiungi ToDo" }
    static var description: IntentDescription {
        IntentDescription("Aggiunge una nuova ToDo a una delle tue liste Taskly.")
    }

    @Parameter(title: "Titolo", requestValueDialog: "Cosa vuoi aggiungere?")
    var todoTitle: String

    @Parameter(title: "Lista", requestValueDialog: "A quale lista?")
    var list: TodoListEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Aggiungi \(\.$todoTitle) a \(\.$list)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            try await TasklyAPI.createTodo(title: todoTitle, listId: list.id)
            return .result(dialog: "Ho aggiunto \"\(todoTitle)\" a \(list.name).")
        } catch TasklyAPI.APIError.notAuthenticated {
            return .result(dialog: "Devi prima accedere all'app Taskly per usare Siri.")
        } catch {
            return .result(dialog: "Non sono riuscito ad aggiungere la ToDo. Riprova dall'app.")
        }
    }
}
