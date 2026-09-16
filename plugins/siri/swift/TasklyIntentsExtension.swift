//
//  TasklyIntentsExtension.swift
//  TasklyIntents
//
//  Punto di ingresso dell'estensione. Un ExtensionKit extension (a
//  differenza delle vecchie NSExtension) è un eseguibile a sé e deve avere
//  un `@main`: senza, il binario esce privo della sezione __swift5_entry e
//  iOS rifiuta di installare l'app.
//
//  Il corpo resta vuoto di proposito: gli intent veri (AddTodoIntent,
//  CreateListIntent, ReadTodosIntent) sono scoperti dal sistema tramite i
//  metadati generati a build-time, non registrati qui a mano.
//

import AppIntents

@main
struct TasklyIntentsExtension: AppIntentsExtension {}
