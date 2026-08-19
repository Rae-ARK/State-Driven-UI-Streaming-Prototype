# State-Driven UI Streaming Prototype

**Status:** Experimental MVP

**Implementation:** Vue 3

**Purpose:** Validate the feasibility of remotely driven, incrementally updated UI state before implementing the same model in ARKlight.

## 1. Objective

Build a small Vue 3 application that demonstrates a persistent UI driven by a remotely supplied state model.

The prototype should answer one question:

> Can a UI remain mounted while a server continuously supplies state changes that are applied incrementally, without requiring a full-page reload?

This project is intentionally independent of ARKlight's current implementation.

ARKlight does not need to be mature before this concept is tested.

## 2. Core Idea

The prototype separates three concerns:

1. **State source**

   A small HTTP server owns the current application state.

2. **State transport**

   The Vue client periodically retrieves the current state or receives updates through a simple streaming mechanism.

3. **UI rendering**

   Vue maintains the UI and reacts to state changes.

Conceptually:

```text

┌──────────────┐

│ State Server │

└──────┬───────┘

       │

       │ state / state updates

       ▼

┌──────────────────┐

│ Vue 3 Client     │

│                  │

│ Reactive State   │

│        ↓         │

│ Component Tree   │

└──────────────────┘

```

The server does not send HTML.

The client does not reconstruct the entire application.

The server provides **data**, and the client determines how that data is represented.

## 3. MVP Scope

The first implementation should remain deliberately small.

### Required

* Vue 3 application

* Small HTTP server

* Single application state object

* State endpoint

* Automatic client updates

* Visible UI change when server state changes

* No browser page reload

* Clear separation between transport and UI

* Local development instructions

### Not Required

* ARKlight integration

* `.arklight` binary format

* carklight

* native rendering

* WebSocket infrastructure

* authentication

* production deployment

* distributed state

* persistent databases

* complex routing

The purpose is to validate the model, not accidentally build a startup.

## 4. Initial State Model

The server should expose a simple JSON-compatible state representation.

Example conceptual state:

```text

{

  title: "...",

  message: "...",

  counter: 0,

  updated_at: "..."

}

```

The exact schema is intentionally unimportant at this stage.

The important property is that the state can change independently of the Vue application.

## 5. Client Architecture

The Vue application should maintain a local reactive representation of the remote state.

Conceptually:

```text

Remote State

     ↓

Transport

     ↓

State Store

     ↓

Vue Reactivity

     ↓

Components

```

The transport layer should not directly manipulate DOM elements.

Components should not know how the server is contacted.

The state layer should be replaceable.

This allows the same UI to eventually consume:

* HTTP state

* WebSocket state

* local mock state

* ARKlight state

* embedded device state

without changing the components themselves.

## 6. Update Strategy

The initial MVP may use polling because it minimizes infrastructure.

For example:

```text

Client

  │

  ├── GET /state

  │

  ├── receive state

  │

  ├── update reactive state

  │

  └── repeat

```

The implementation should make the transport replaceable so that polling can later be replaced with a persistent stream.

Possible later transports:

* Server-Sent Events

* WebSocket

* long polling

* ARKlight live-streaming

* local IPC

* embedded transport

The UI should not need to know which transport is being used.

## 7. Demonstration

The MVP should provide an obvious demonstration.

A developer starts the server and client.

The browser displays the current state.

The server-side state is then changed without restarting the Vue application.

The browser should update the affected UI while remaining on the same page.

The demonstration should make the distinction obvious:

```text

Traditional page model:

state change

    ↓

request

    ↓

new document

    ↓

page reload

Prototype model:

state change

    ↓

state update

    ↓

reactive reconciliation

    ↓

affected UI updates

```

## 8. Reference Implementation, Not Final Architecture

Vue 3 is being used as an experimental implementation platform.

It is **not** a proposed dependency of ARKlight.

The prototype exists because Vue already provides:

* mature reactivity

* component rendering

* state updates

* development tooling

* fast iteration

This allows the underlying idea to be tested before ARKlight implements its own runtime.

If the experiment fails, ARKlight does not inherit an unnecessary architecture.

If the experiment succeeds, the behavior becomes a concrete reference for a future ARKlight implementation.

## 9. Future ARKlight Mapping

If the prototype validates the model, the conceptual migration becomes:

```text

Vue prototype

State Server

     ↓

Transport

     ↓

Reactive State

     ↓

Vue Components

```

to:

```text

ARKlight

State Server

     ↓

Live-streaming transport

     ↓

ARKlight state

     ↓

ARKlight UI representation

     ↓

Target renderer

```

The target renderer may eventually be:

* HTML

* desktop native UI

* Android

* embedded UI

* digital signage

* other platform-specific targets

The state model should remain independent of the renderer.

## 10. Relationship to Live-Streaming

This prototype is also intended to investigate the broader ARKlight concept of live-streaming.

The important distinction is:

**Live-streaming does not necessarily mean streaming rendered content.**

It can mean streaming **changes to application state**.

That allows the client to remain responsible for rendering while the server remains responsible for supplying changing information.

Conceptually:

```text

Server

  │

  │ state changes

  ▼

Client state

  │

  │ reconciliation

  ▼

UI

```

This could eventually provide a foundation for applications such as:

* dashboards

* control panels

* remote displays

* digital signage

* monitoring interfaces

* collaborative interfaces

* embedded displays

## 11. Success Criteria

The prototype is considered successful if it demonstrates all of the following:

* The UI remains mounted during updates.

* Server state can change independently of the client.

* The client receives the changed state.

* Vue updates the affected UI reactively.

* No manual browser refresh is required.

* Transport logic remains separate from UI components.

* The state representation is simple enough that another runtime could reproduce the behavior.

* The implementation can later replace polling with a persistent streaming transport without redesigning the UI.

## 12. Non-Goals

This prototype should not attempt to prove that ARKlight is faster than Vue.

It should not attempt to prove that a custom UI runtime is immediately better than existing frameworks.

It should not prematurely define the final ARKlight wire protocol.

It should not become an implementation of `.arklight`.

It should not become a production streaming service.

The only question being tested is whether the **state-driven UI model itself is practical and useful**.

## 13. Guiding Principle

> **Prototype the behavior before implementing the runtime.**

ARKlight should not need to exist before the idea behind ARKlight can be tested.

A mature existing framework is useful precisely because it lets the experiment happen now.

If the model works, ARKlight can later provide its own implementation with the knowledge gained from the prototype.

## 14. Future Direction

If the MVP succeeds, the next experiment should replace polling with a persistent stream.

The progression would be:

```text

Stage 0

Vue + HTTP polling

        ↓

Stage 1

Vue + persistent state stream

        ↓

Stage 2

ARKlight-compatible state representation

        ↓

Stage 3

ARKlight live-streaming

        ↓

Stage 4

Native / embedded renderer

```

Each stage should preserve the same fundamental contract:

> **The application state changes independently of the UI renderer, and the UI remains synchronized with that state.**

That contract is the actual experiment.

Everything else is implementation detail.



## 15. Application Runtime Hypothesis

A successful implementation may also demonstrate that a state-driven UI can operate as a self-contained application runtime.

The prototype should eventually test whether the server and UI can be packaged and launched together so that:

* the application starts its own local state server;

* the UI connects to that server automatically;

* application state remains persistent while the UI is running;

* state updates are reflected without a document reload;

* the combined package behaves like a conventional desktop application from the user's perspective.

This is relevant to the eventual ARKlight architecture because a desktop application can be understood as a persistent UI runtime with a locally hosted application state/data source.

The prototype does not need to reproduce a complete desktop wrapper. It only needs to establish whether this runtime model is practical.

If validated, the same model could later be adapted to:

* desktop applications;

* Android applications;

* embedded displays;

* digital signage;

* remotely controlled interfaces.

The renderer and platform may change, while the underlying application/state model remains consistent.

The experiment therefore tests not only whether ARKlight can stream state into a UI, but whether that mechanism can serve as the foundation for an application runtime independent of the final rendering platform.

