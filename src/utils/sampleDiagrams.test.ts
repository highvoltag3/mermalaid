/**
 * Validates that all built-in sample/default diagrams render without errors.
 * Prevents regressions like namespace/class name collisions in classDiagram samples.
 *
 * NOTE: The namespace/class collision error ("Setting X as parent of X would create a cycle")
 * occurs at render time, not parse time. Mermaid.parse() succeeds for such diagrams because
 * the syntax is valid; the semantic error surfaces only during diagram construction.
 * Our hasNamespaceClassCollision() check catches these statically before render.
 */
import { describe, expect, it } from 'vitest'
import mermaid from 'mermaid'
import {
  ALL_SAMPLE_DIAGRAMS,
  BROKEN_CLASSDIAGRAM_DEMO,
  DEFAULT_DIAGRAM,
  NEW_DIAGRAM,
  VALID_CLASSDIAGRAM_SAMPLE,
  hasNamespaceClassCollision,
  isBrokenClassDiagramDemo,
} from './sampleDiagrams'

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
      // The parent cycle error happens during diagram construction, not parsing.
      // This test documents that mermaid.parse() alone doesn't catch this issue.
      const result = await mermaid.parse(BROKEN_CLASSDIAGRAM_DEMO)
      expect(result).toMatchObject({ diagramType: 'class' })
    })

    it('has namespace/class collision (caught by our static check)', () => {
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
