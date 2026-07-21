// Static Mermaid syntax cheat-sheets served by the `get_syntax_reference` tool.
// Grounding the agent in correct syntax up front means fewer invalid `set_diagram` calls.

export interface SyntaxEntry {
  type: string
  title: string
  summary: string
  snippet: string
  tips: string[]
}

const ENTRIES: SyntaxEntry[] = [
  {
    type: 'flowchart',
    title: 'Flowchart',
    summary: 'Nodes connected by arrows. Also written as `graph`. Directions: TD/TB, LR, RL, BT.',
    snippet: [
      'flowchart TD',
      '    A[Start] --> B{Decision?}',
      '    B -->|Yes| C[Do thing]',
      '    B -->|No| D[Other thing]',
      '    C --> E([Rounded end])',
      '    D --> E',
      '    subgraph Group',
      '        C',
      '    end',
    ].join('\n'),
    tips: [
      'Quote labels containing spaces or special chars: A["Label (with parens)"].',
      'Node shapes: [rect], (round), ([stadium]), [[subroutine]], [(cylinder)], {diamond}, {{hexagon}}.',
      'Edges: --> arrow, --- line, -.-> dotted, ==> thick, -->|label| labelled.',
      'Subgraphs end with `end` (never `end sub`).',
    ],
  },
  {
    type: 'sequence',
    title: 'Sequence diagram',
    summary: 'Actors exchanging messages over time.',
    snippet: [
      'sequenceDiagram',
      '    participant A as Alice',
      '    participant B as Bob',
      '    A->>B: Solid arrow (call)',
      '    B-->>A: Dashed arrow (return)',
      '    Note over A,B: A note spanning both',
      '    loop Every minute',
      '        A->>B: Ping',
      '    end',
      '    alt is ok',
      '        B->>A: Yes',
      '    else not ok',
      '        B->>A: No',
      '    end',
    ].join('\n'),
    tips: [
      'Arrows: ->> solid, -->> dashed, -x with cross, use +/- for activations (A->>+B, B-->>-A).',
      'Blocks: loop, alt/else, opt, par/and, critical, break — each closed by `end`.',
    ],
  },
  {
    type: 'class',
    title: 'Class diagram',
    summary: 'Classes, members, and relationships.',
    snippet: [
      'classDiagram',
      '    class Animal {',
      '        +String name',
      '        +int age',
      '        +makeSound() void',
      '    }',
      '    class Dog',
      '    Animal <|-- Dog : inherits',
      '    Animal "1" o-- "many" Leg : has',
    ].join('\n'),
    tips: [
      'Relations: <|-- inheritance, *-- composition, o-- aggregation, --> association, ..> dependency.',
      'Visibility: + public, - private, # protected, ~ package.',
      'Cardinality in quotes: "1", "0..*", "many".',
    ],
  },
  {
    type: 'state',
    title: 'State diagram',
    summary: 'States and transitions. Use `stateDiagram-v2`.',
    snippet: [
      'stateDiagram-v2',
      '    [*] --> Idle',
      '    Idle --> Running : start',
      '    Running --> Idle : stop',
      '    Running --> [*] : shutdown',
      '    state Running {',
      '        [*] --> Working',
      '        Working --> Paused : pause',
      '    }',
    ].join('\n'),
    tips: [
      '[*] marks start and end states.',
      'Composite states use `state Name { ... }`.',
      'Choice/fork/join via `state x <<choice>>` etc.',
    ],
  },
  {
    type: 'er',
    title: 'Entity relationship diagram',
    summary: 'Entities and their relationships with crow’s-foot cardinality.',
    snippet: [
      'erDiagram',
      '    CUSTOMER ||--o{ ORDER : places',
      '    ORDER ||--|{ LINE_ITEM : contains',
      '    CUSTOMER {',
      '        string name',
      '        string email',
      '    }',
    ].join('\n'),
    tips: [
      'Cardinality: || one-and-only-one, o{ zero-or-many, |{ one-or-many, o| zero-or-one.',
      'Left/right symbols mirror each other around the -- line.',
    ],
  },
  {
    type: 'gantt',
    title: 'Gantt chart',
    summary: 'Project schedule with tasks and dates.',
    snippet: [
      'gantt',
      '    title Project plan',
      '    dateFormat YYYY-MM-DD',
      '    section Design',
      '        Research    :a1, 2024-01-01, 7d',
      '        Mockups     :after a1, 5d',
      '    section Build',
      '        Implement   :2024-01-15, 10d',
    ].join('\n'),
    tips: [
      'Task syntax: name :id, start, duration (e.g. 5d) or `after <id>`.',
      'States: done, active, crit prefix the task, e.g. `:crit, active, ...`.',
    ],
  },
  {
    type: 'pie',
    title: 'Pie chart',
    summary: 'Proportional slices.',
    snippet: ['pie title Browser share', '    "Chrome" : 65', '    "Safari" : 20', '    "Other" : 15'].join('\n'),
    tips: ['Each slice is a quoted label and a number.', 'Add `showData` after `pie` to print values.'],
  },
  {
    type: 'mindmap',
    title: 'Mindmap',
    summary: 'Indentation-based hierarchy from a root.',
    snippet: [
      'mindmap',
      '  root((Central idea))',
      '    Branch A',
      '      Leaf 1',
      '      Leaf 2',
      '    Branch B',
      '      Leaf 3',
    ].join('\n'),
    tips: ['Hierarchy is set purely by indentation.', 'Root shapes: ((circle)), [square], (rounded)).'],
  },
  {
    type: 'journey',
    title: 'User journey',
    summary: 'Steps scored by sentiment across sections.',
    snippet: [
      'journey',
      '    title My working day',
      '    section Morning',
      '        Wake up: 3: Me',
      '        Commute: 2: Me',
      '    section Office',
      '        Standup: 4: Me, Team',
    ].join('\n'),
    tips: ['Step syntax: `Task: <score 1-5>: <actors>`.'],
  },
  {
    type: 'gitgraph',
    title: 'Git graph',
    summary: 'Branch/commit/merge history.',
    snippet: [
      'gitGraph',
      '    commit',
      '    branch develop',
      '    checkout develop',
      '    commit',
      '    checkout main',
      '    merge develop',
    ].join('\n'),
    tips: ['Commands: commit, branch <name>, checkout <name>, merge <name>, cherry-pick.'],
  },
]

// Additional diagram types Mermaid supports that aren't given a full cheat-sheet here.
const ADDITIONAL_TYPES = [
  'timeline',
  'quadrantChart',
  'requirementDiagram',
  'c4',
  'sankey-beta',
  'xychart-beta',
  'block-beta',
  'packet-beta',
  'kanban',
  'architecture-beta',
]

const ALIASES: Record<string, string> = {
  graph: 'flowchart',
  flow: 'flowchart',
  flowchart: 'flowchart',
  sequence: 'sequence',
  sequencediagram: 'sequence',
  class: 'class',
  classdiagram: 'class',
  state: 'state',
  statediagram: 'state',
  statediagramv2: 'state',
  er: 'er',
  erdiagram: 'er',
  entity: 'er',
  gantt: 'gantt',
  pie: 'pie',
  mindmap: 'mindmap',
  journey: 'journey',
  userjourney: 'journey',
  git: 'gitgraph',
  gitgraph: 'gitgraph',
}

export function normalizeDiagramType(input: string): string {
  return input.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

export function getSyntaxEntry(type: string): SyntaxEntry | null {
  const key = ALIASES[normalizeDiagramType(type)]
  if (!key) return null
  return ENTRIES.find((e) => e.type === key) ?? null
}

export function getSyntaxIndex(): {
  documented: Array<{ type: string; title: string; summary: string }>
  additionalTypes: string[]
} {
  return {
    documented: ENTRIES.map((e) => ({ type: e.type, title: e.title, summary: e.summary })),
    additionalTypes: ADDITIONAL_TYPES,
  }
}
