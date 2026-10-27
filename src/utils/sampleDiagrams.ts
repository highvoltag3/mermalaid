/**
 * Built-in sample/default diagrams used throughout the application.
 *
 * IMPORTANT: Mermaid treats namespaces and classes as nodes with the same id,
 * so a class named "Demo" inside a namespace "Demo" creates a parent cycle error.
 * Always ensure namespace and class names differ in classDiagram samples.
 */

/** Default diagram shown when the editor first opens (no localStorage draft). */
export const DEFAULT_DIAGRAM = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`

/** Simpler diagram shown when user clicks "New". */
export const NEW_DIAGRAM = `graph TD
    A[Start] --> B[End]`
