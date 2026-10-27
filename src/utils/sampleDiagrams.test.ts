/**
 * Validates that all built-in sample/default diagrams render without errors.
 * Prevents regressions like namespace/class name collisions in classDiagram samples.
 *
 * NOTE: The namespace/class collision error ("Setting X as parent of X would create a cycle")
 * occurs at render time, not parse time. Mermaid.parse() succeeds for such diagrams because
 * the syntax is valid; the semantic error surfaces only during diagram construction.
 */
import { describe, expect, it } from 'vitest'
import mermaid from 'mermaid'
import { DEFAULT_DIAGRAM, NEW_DIAGRAM } from './sampleDiagrams'

/**
 * Known broken classDiagram pattern that causes "Setting X as parent of X would
 * create a cycle" error. Used for test coverage only.
 */
const BROKEN_CLASSDIAGRAM_DEMO = `classDiagram
namespace Demo {
  class Demo
}`

/** A valid classDiagram example for testing. */
const VALID_CLASSDIAGRAM_SAMPLE = `classDiagram
    class Animal {
        +String name
        +int age
        +eat()
    }
    class Dog {
        +bark()
    }
    Animal <|-- Dog`

/** All samples that must render without error. */
const ALL_SAMPLE_DIAGRAMS: { name: string; code: string }[] = [
  { name: 'default-diagram', code: DEFAULT_DIAGRAM },
  { name: 'new-diagram', code: NEW_DIAGRAM },
  { name: 'classDiagram-sample', code: VALID_CLASSDIAGRAM_SAMPLE },
]

/** Checks if code matches the known broken classDiagram pattern. */
function isBrokenClassDiagramDemo(code: string): boolean {
  const normalized = code.trim().replace(/\s+/g, ' ')
  const brokenNormalized = BROKEN_CLASSDIAGRAM_DEMO.trim().replace(/\s+/g, ' ')
  return normalized === brokenNormalized
}

/** Checks if code contains a namespace/class collision pattern. */
function hasNamespaceClassCollision(code: string): boolean {
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

describe('sampleDiagrams', () => {
  describe('ALL_SAMPLE_DIAGRAMS', () => {
    it.each(ALL_SAMPLE_DIAGRAMS)(
      '$name: parses without error',
      async ({ code }) => {
        await expect(mermaid.parse(code)).resolves.not.toThrow()
      },
    )

    it.each(ALL_SAMPLE_DIAGRAMS)(
      '$name: has no namespace/class collision',
      ({ code }) => {
        expect(hasNamespaceClassCollision(code)).toBe(false)
      },
    )
  })

  describe('DEFAULT_DIAGRAM', () => {
    it('is included in ALL_SAMPLE_DIAGRAMS', () => {
      expect(ALL_SAMPLE_DIAGRAMS.some((s) => s.code === DEFAULT_DIAGRAM)).toBe(true)
    })

    it('starts with a valid flowchart header', () => {
      expect(DEFAULT_DIAGRAM.trim()).toMatch(/^(graph|flowchart)\s+[TDLR]/i)
    })
  })

  describe('NEW_DIAGRAM', () => {
    it('is included in ALL_SAMPLE_DIAGRAMS', () => {
      expect(ALL_SAMPLE_DIAGRAMS.some((s) => s.code === NEW_DIAGRAM)).toBe(true)
    })

    it('starts with a valid flowchart header', () => {
      expect(NEW_DIAGRAM.trim()).toMatch(/^(graph|flowchart)\s+[TDLR]/i)
    })
  })

  describe('VALID_CLASSDIAGRAM_SAMPLE', () => {
    it('is included in ALL_SAMPLE_DIAGRAMS', () => {
      expect(ALL_SAMPLE_DIAGRAMS.some((s) => s.code === VALID_CLASSDIAGRAM_SAMPLE)).toBe(true)
    })

    it('parses without error', async () => {
      await expect(mermaid.parse(VALID_CLASSDIAGRAM_SAMPLE)).resolves.not.toThrow()
    })
  })

  describe('BROKEN_CLASSDIAGRAM_DEMO', () => {
    it('is NOT included in ALL_SAMPLE_DIAGRAMS', () => {
      expect(ALL_SAMPLE_DIAGRAMS.some((s) => s.code === BROKEN_CLASSDIAGRAM_DEMO)).toBe(false)
    })

    it('parses as valid syntax (error occurs at render time)', async () => {
      const result = await mermaid.parse(BROKEN_CLASSDIAGRAM_DEMO)
      expect(result).toMatchObject({ diagramType: 'class' })
    })

    it('has namespace/class collision (caught by static check)', () => {
      expect(hasNamespaceClassCollision(BROKEN_CLASSDIAGRAM_DEMO)).toBe(true)
    })
  })

  describe('isBrokenClassDiagramDemo', () => {
    it('detects exact match of broken demo', () => {
      expect(isBrokenClassDiagramDemo(BROKEN_CLASSDIAGRAM_DEMO)).toBe(true)
    })

    it('detects match with different whitespace', () => {
      const withExtraWhitespace = `classDiagram
namespace   Demo  {
  class   Demo
}`
      expect(isBrokenClassDiagramDemo(withExtraWhitespace)).toBe(true)
    })

    it('does not match valid diagrams', () => {
      expect(isBrokenClassDiagramDemo(DEFAULT_DIAGRAM)).toBe(false)
      expect(isBrokenClassDiagramDemo(VALID_CLASSDIAGRAM_SAMPLE)).toBe(false)
    })
  })

  describe('hasNamespaceClassCollision', () => {
    it('detects namespace Foo with class Foo inside', () => {
      const code = `classDiagram
namespace Foo {
  class Foo
}`
      expect(hasNamespaceClassCollision(code)).toBe(true)
    })

    it('does not flag namespace and class with different names', () => {
      const code = `classDiagram
namespace Animals {
  class Dog
  class Cat
}`
      expect(hasNamespaceClassCollision(code)).toBe(false)
    })

    it('does not flag non-classDiagram code', () => {
      expect(hasNamespaceClassCollision(DEFAULT_DIAGRAM)).toBe(false)
    })

    it('handles case variations', () => {
      const code = `CLASSDIAGRAM
namespace Test {
  class Test
}`
      expect(hasNamespaceClassCollision(code)).toBe(true)
    })
  })
})
