//
//  TasklyShortcuts.swift
//  TasklyIntents
//
//  Frasi trigger compilate a build-time (Apple non permette di generarle
//  dinamicamente da JS/dati remoti): "\(.applicationName)" è obbligatorio
//  in ogni frase per policy Apple sugli App Shortcuts.
//

import AppIntents

struct TasklyShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        // Solo AppEntity/AppEnum sono interpolabili in una frase — titolo e
        // nome lista sono String libere, quindi non compaiono nelle frasi
        // trigger: Siri li chiede a voce dopo aver riconosciuto la frase,
        // tramite requestValueDialog sul parametro stesso.
        AppShortcut(
            intent: AddTodoIntent(),
            phrases: [
                "Aggiungi una ToDo a \(.applicationName)",
                "Aggiungi una ToDo con \(.applicationName)"
            ],
            shortTitle: "Aggiungi ToDo",
            systemImageName: "checklist"
        )

        AppShortcut(
            intent: CreateListIntent(),
            phrases: [
                "Crea una lista in \(.applicationName)",
                "Crea una lista con \(.applicationName)",
                "Nuova lista in \(.applicationName)"
            ],
            shortTitle: "Crea lista",
            systemImageName: "folder.badge.plus"
        )

        AppShortcut(
            intent: CompleteTodoIntent(),
            phrases: [
                "Completa una ToDo in \(.applicationName)",
                "Segna una ToDo come fatta in \(.applicationName)",
                "Ho fatto una ToDo in \(.applicationName)"
            ],
            shortTitle: "Completa ToDo",
            systemImageName: "checkmark.circle"
        )

        AppShortcut(
            intent: ReopenTodoIntent(),
            phrases: [
                "Riapri una ToDo in \(.applicationName)",
                "Rimetti una ToDo da fare in \(.applicationName)"
            ],
            shortTitle: "Riapri ToDo",
            systemImageName: "arrow.uturn.backward.circle"
        )

        AppShortcut(
            intent: ReadTodosIntent(),
            phrases: [
                "Leggi le ToDo di \(.applicationName)",
                "Cosa c'è da fare in \(.applicationName)",
                "Cosa devo fare in \(.applicationName)"
            ],
            shortTitle: "Leggi ToDo",
            systemImageName: "list.bullet"
        )
    }
}
