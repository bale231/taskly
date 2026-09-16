//
//  DeleteListIntent.swift
//  TasklyIntents
//
//  "Elimina una lista in Taskly". L'azione più distruttiva dell'intera
//  estensione: con la lista spariscono anche tutte le sue todo, quindi la
//  conferma dice quante se ne stanno per perdere invece di chiedere un sì
//  generico.
//

import AppIntents

struct DeleteListIntent: AppIntent {
    static var title: LocalizedStringResource { "Elimina lista" }
    static var description: IntentDescription {
        IntentDescription("Elimina definitivamente una lista Taskly e tutte le sue ToDo.")
    }

    @Parameter(title: "Lista", requestValueDialog: "Quale lista vuoi eliminare?")
    var list: TodoListEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Elimina la lista \(\.$list)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            // Il conteggio si legge prima di chiedere conferma: "elimino la
            // lista e le sue 12 ToDo" è un'informazione che cambia la
            // risposta di chi ascolta, molto più di un sì/no generico.
            let todoCount = (try? await TasklyAPI.fetchTodos(listId: list.id).count) ?? 0

            let question: IntentDialog =
                todoCount > 0
                ? "Vuoi davvero eliminare \(list.name) e le sue \(todoCount) ToDo?"
                : "Vuoi davvero eliminare \(list.name)?"

            try await requestConfirmation(result: .result(dialog: question))

            try await TasklyAPI.deleteList(listId: list.id)
            return .result(dialog: "Ho eliminato la lista \(list.name).")
        } catch TasklyAPI.APIError.notAuthenticated {
            return .result(dialog: "Devi prima accedere all'app Taskly per usare Siri.")
        } catch {
            return .result(dialog: "Non sono riuscito a eliminare la lista. Riprova dall'app.")
        }
    }
}
