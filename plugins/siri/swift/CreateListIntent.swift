//
//  CreateListIntent.swift
//  TasklyIntents
//
//  "Crea una lista in Taskly": Siri chiede nome e colore a voce, poi crea
//  la lista via API senza aprire l'app. Stesso schema di AddTodoIntent.
//

import AppIntents

struct CreateListIntent: AppIntent {
    static var title: LocalizedStringResource { "Crea lista" }
    static var description: IntentDescription {
        IntentDescription("Crea una nuova lista in Taskly.")
    }

    @Parameter(title: "Nome", requestValueDialog: "Come vuoi chiamare la lista?")
    var listName: String

    @Parameter(title: "Colore", requestValueDialog: "Di che colore?")
    var color: ListColorAppEnum

    static var parameterSummary: some ParameterSummary {
        Summary("Crea la lista \(\.$listName) di colore \(\.$color)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            let created = try await TasklyAPI.createList(name: listName, color: color.rawValue)
            // Il nome arriva dal server (non da `listName`) così la conferma
            // riflette ciò che è stato davvero salvato.
            return .result(dialog: "Ho creato la lista \(created.name).")
        } catch TasklyAPI.APIError.notAuthenticated {
            return .result(dialog: "Devi prima accedere all'app Taskly per usare Siri.")
        } catch {
            return .result(dialog: "Non sono riuscito a creare la lista. Riprova dall'app.")
        }
    }
}
