# Strategic Pivot: Engineering Intelligence Dashboard

## Vision
Transform the application from a generic SaaS metrics dashboard into a specialized **Engineering Intelligence Platform** for AI-assisted development. The goal is to answer: *"Is AI helping us build better software faster?"*

## 1. Navigation Restructuring
Replace generic items with engineering-focused views.

**New Navigation Structure:**
1.  **Dashboard** (Real-time pulse, aggregations)
2.  **ROI & Value** (Cost vs. Hours Saved)
3.  **DORA & Speed** (Velocity, Lead Time, Deployment Frequency)
4.  **Codebase** (Project heatmaps, AI saturation)
5.  **Team** (Adoption, utilization)
6.  **Settings**

## 2. DORA Metrics Implementation
Leverage existing data to approximate DORA metrics.

| Metric | Implementation Strategy | Data Source |
| :--- | :--- | :--- |
| **Deployment Frequency** | Count `prsMerged` events (Proxy for deployment). | `dailyAggregates.prsMerged` |
| **Lead Time for Changes** | Time delta: `session_start` (First interaction) -> `prMerged`. | `sessions` joined with `prActivity` |
| **Change Failure Rate** | Ratio of `bug_fix` commits to total commits. | `workItems` (type='bug_fix') |

## 3. Execution Plan

### Phase 1: Cleanup & Navigation (Immediate)
*   [ ] Remove legacy `Documents` and `Favorites` routes/components.
*   [ ] Rename `Reports` to `DORA & Speed`.
*   [ ] Update Sidebar navigation.

### Phase 2: DORA Metrics Engine
*   [ ] Create `src/app/dora/page.tsx`.
*   [ ] Implement Lead Time calculation logic (SQL queries).
*   [ ] Implement Deployment Frequency visualization.
*   [ ] Compare "AI-Assisted" vs "Manual" velocity (if data allows).

### Phase 3: Project Intelligence ("Codebase")
*   [ ] Create `src/app/codebase/page.tsx`.
*   [ ] Visualize AI touches per repository.
*   [ ] Heatmap of file modifications.

### Phase 4: Impact & Quality
*   [ ] Implement "Code Churn" metric (% of AI lines deleted < 48h).
*   [ ] Analyze Tool Chaining depth.
