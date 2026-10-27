/**
 * Built-in sample/default diagrams used throughout the application.
 * Centralizes all starter content so tests can validate every sample renders.
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

/**
 * Known broken classDiagram pattern that causes "Setting X as parent of X would
 * create a cycle" error. Used for migration detection and test coverage.
 * DO NOT use this as a default or sample.
 */
export const BROKEN_CLASSDIAGRAM_DEMO = `classDiagram
namespace Demo {
  class Demo
}`

/**
 * A valid classDiagram example suitable for demos and documentation.
 * Uses distinct namespace and class names to avoid the parent cycle issue.
 */
export const VALID_CLASSDIAGRAM_SAMPLE = `classDiagram
    class Animal {
        +String name
        +int age
        +eat()
    }
    class Dog {
        +bark()
    }
    Animal <|-- Dog`

/**
 * All built-in diagram samples that must render without error.
 * Add new samples here to include them in validation tests.
 */
export const ALL_SAMPLE_DIAGRAMS: { name: string; code: string }[] = [
  { name: 'default-diagram', code: DEFAULT_DIAGRAM },
  { name: 'new-diagram', code: NEW_DIAGRAM },
  { name: 'classDiagram-sample', code: VALID_CLASSDIAGRAM_SAMPLE },
]

/**
 * Checks if the given code matches the known broken classDiagram pattern
 * (namespace and class share the same "Demo" name).
 */
export function isBrokenClassDiagramDemo(code: string): boolean {
  const normalized = code.trim().replace(/\s+/g, ' ')
  const brokenNormalized = BROKEN_CLASSDIAGRAM_DEMO.trim().replace(/\s+/g, ' ')
  return normalized === brokenNormalized
}

/**
 * Checks if the given code contains a namespace/class collision pattern
 * where a class inside a namespace shares the same name as the namespace.
 * This is a broader check than isBrokenClassDiagramDemo.
 */
export function hasNamespaceClassCollision(code: string): boolean {
  if (!code.toLowerCase().includes('classdiagram')) return false

  const namespaceMatch = code.match(/namespace\s+(\w+)\s*\{/i)
  if (!namespaceMatch) return false

  const namespaceName = namespaceMatch[1]
  const classInsideNamespace = new RegExp(
    `namespace\\s+${namespaceName}\\s*\\{[^}]*\\bclass\\s+${namespaceName}\\b`,
    'i',
  )
  return classInsideNamespace.test(code)
}
