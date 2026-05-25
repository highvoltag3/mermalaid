---
document: anonymized-architecture-fixture
# YAML comments use # — not part of Mermaid
visibility: fixture-only
---

# Kestrel — sample system architecture (anonymized test fixture)

```mermaid
graph TB
    %% Synthetic diagram: structure-only regression fixture
    subgraph "ClientShell"
        Shell["Shell<br/>(React / something)"]

        subgraph "Flux Views"
            VCreate["Create View"]
            VDetail["Detail View"]
            VCal["Calendar View"]
        end

        Shell --> VCreate
        Shell --> VDetail
        Shell --> VCal
    end

    subgraph "AppServer (Node)"
        Routes["Route Handlers"]

        subgraph BE ["WidgetOrchestrator ⚙️"]
            direction TB
            CapA["Capacity<br/><i>guess hours</i>"]
            SlotA["Slots<br/><i>buffers</i>"]
            BookA["Booking<br/><i>place units</i>"]
            ApproveA["Approvals<br/><i>manager gate</i>"]
            DataA["Aggregation<br/><i>enrich drafts</i>"]
        end

        OrmLayer["ORM Layer"]

        Routes --> BE
        Routes --> OrmLayer
    end

    subgraph "External Mesh"
        subgraph "Private Network API"
            Upstream["Upstream API<br/>(GraphQL)<br/><i>IP allowlist</i>"]
        end

        subgraph "Edge Cache Layer"
            Edge["Edge CDN"]
            PodX["worker-pod-x"]
            PodY["worker-pod-y"]
            PodZ["… more workers"]
            Edge --> PodX
            Edge --> PodY
            Edge --> PodZ
        end

        SSOGate["SSO<br/>(OAuth)"]
    end

    subgraph "Persistence"
        WAL[("WalnutSQL<br/>(hosted)")]
    end

    VCreate --> Routes
    VDetail --> Routes
    VCal --> Routes
    Shell -- "shardKey" --> SSOGate

    Routes -- "GraphQL<br/>orders, widgets,<br/>status blobs" --> Upstream
    Routes -. "REST via Edge<br/>printer-ish data<br/>(future — not MVP)" .-> Edge
    OrmLayer -- "widgets, bookings,<br/>slots, knobs" --> WAL

    BE -- "read orders &<br/>widgets" --> Upstream
    BE -- "read & write local<br/>widget state" --> OrmLayer

    style Shell fill:#0070f3,color:#fff
    style Routes fill:#0070f3,color:#fff
    style OrmLayer fill:#2D3748,color:#fff
    style Upstream fill:#FF9900,color:#fff
    style Edge fill:#FF9900,color:#fff,stroke-dasharray: 5 5
    style SSOGate fill:#6C47FF,color:#fff
    style WAL fill:#336791,color:#fff
    style BE fill:none,stroke:#F59E0B,stroke-width:2px,stroke-dasharray: 5 5
    style CapA fill:#F59E0B,color:#fff
    style SlotA fill:#F59E0B,color:#fff
    style BookA fill:#F59E0B,color:#fff
    style ApproveA fill:#F59E0B,color:#fff
    style DataA fill:#F59E0B,color:#fff
    style VCreate fill:#10B981,color:#fff
    style VDetail fill:#10B981,color:#fff
    style VCal fill:#10B981,color:#fff
```

> **Note:** The dashed “WidgetOrchestrator” group is embedded in the app server in this fiction.

> **Note:** The “Edge Cache” path is a placeholder — MVP only talks to Upstream.

---

## Data ownership (anonymized)

| Owner | Storage | Data |
|---|---|---|
| **Local app** | WalnutSQL via ORM | Widgets, bookings, slot holds, knobs |
| **Upstream** | Private network | Orders, widgets, fulfilment blobs |
| **Edge workers** | On-prem → CDN | Capacity hints *(future)* |

## Data flow

| From | To | Protocol | Data |
|---|---|---|---|
| Shell | Routes | HTTP | Views hit routes |
| Routes | WidgetOrchestrator | Internal | Capacity math |
| Routes | Upstream | GraphQL | Orders / status |
| Routes | Edge | REST | Machine hints *(future)* |
| WidgetOrchestrator | WalnutSQL | SQL | Read/write local state |
| WidgetOrchestrator | Upstream | GraphQL | Read remote orders |

---

## WidgetOrchestrator

It pretends to:

- **Guess hours** for a widget run
- **Manage slots** with buffers
- **Book widgets** into slots
- **Approvals** with a manager gate
- **Aggregate** draft data from Upstream for the shell

## Auth

**SSOGate** with OAuth. Routes authenticate every call.

---

## Lifecycle (nonsense states)

```mermaid
stateDiagram-v2
    [*] --> ORANGE
    ORANGE --> MARBLE : Quokka submits
    MARBLE --> TEAL : Llama approves
    MARBLE --> PLUM : Llama rejects
    TEAL --> CORAL : Otter books slot
    CORAL --> INDIGO : Robot starts work
    INDIGO --> GOLD : Robot finishes

    ORANGE --> SILVER : Anyone cancels early
    MARBLE --> SILVER : Anyone cancels mid
    TEAL --> SILVER : Anyone cancels mid
    CORAL --> SILVER : Admin cancels

    PLUM --> [*]
    GOLD --> [*]
    SILVER --> [*]
```

> **Note:** `PLUM` is terminal but can be **cloned** into a fresh `ORANGE`.

| Hop | Who | Blurb |
|---|---|---|
| ORANGE → MARBLE | Quokka | Validates fields |
| MARBLE → TEAL | Llama | Approves |
| MARBLE → PLUM | Llama | Rejects with reason |
| TEAL → CORAL | Otter / Admin | Books slot with version check |
| CORAL → INDIGO | Robot | Production begins |
| INDIGO → GOLD | Robot | Production ends |
| * → SILVER | Mixed | Cancel path |

**Concurrency**: optimistic `version` column on rows.

---

## Upstream integration (fake)

- Static `API_TOKEN` header today
- Future: SSO JWT exchange

The sections below are generic placeholders about snapshots and caching — still markdown tables:

| Upstream status | Behavior |
|---|---|
| **OK** | Live fetch |
| **Slow (> 5s)** | Stale banner |
| **Down** | Snapshot only |

---

## Hosting blurb (trimmed)

| Constraint | Why |
|---|---|
| **Stable egress IP** | Allowlist |
| **Full SSR** | Auth on every page |
| **DB pool** | Connection limits |

### Comparison

| | Lambda-ish | PaaS | Containers |
|---|---|---|---|
| Egress | NAT | Paid feature | VPC |
| SSR | Yes | Yes | Yes |
