//
//  ListColorAppEnum.swift
//  TasklyIntents
//
//  I cinque colori che l'app assegna alle liste (vedi CARD_BG in
//  HomeScreen.tsx). Come AppEnum, Siri può proporli a voce quando chiede
//  il colore durante la creazione di una lista: un parametro String libero
//  accetterebbe qualsiasi cosa e il backend rifiuterebbe i valori non
//  previsti.
//

import AppIntents

enum ListColorAppEnum: String, AppEnum {
    case blue
    case green
    case yellow
    case red
    case purple

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Colore lista" }

    static var caseDisplayRepresentations: [ListColorAppEnum: DisplayRepresentation] = [
        .blue: "Blu",
        .green: "Verde",
        .yellow: "Giallo",
        .red: "Rosso",
        .purple: "Viola",
    ]
}
