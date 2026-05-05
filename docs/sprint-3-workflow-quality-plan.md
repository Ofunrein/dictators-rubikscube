# Sprint 3 Workflow Quality Plan

This page is the working checklist for improving Sprint 3 project management, code management, and documentation. Keep the actual Confluence pages feature-focused, then use this file as the source for ticket templates, PR expectations, and final evidence gathering.

## Sprint 3 Targets

| Area | Sprint 2 feedback | Sprint 3 target |
|------|-------------------|-----------------|
| Jira tickets | Some tickets were one-line summaries | Every ticket has context, scope, acceptance criteria, Definition of Done, estimate, and links |
| Planning | Missing story point estimates | Estimate every ticket before work starts and re-estimate only with a comment explaining why |
| Pull requests | Most PRs were self-approved and self-merged | Every feature PR requests at least one teammate review before merge |
| Documentation | Too many sprint-specific pages | Update existing feature pages or create one feature page per major capability |
| Presentation | More visuals requested | Add screenshots, renderings, diagrams, or short animation captures to feature docs |

## Jira Ticket Template

Use this structure for every Sprint 3 ticket before moving it into progress.

### Summary

Write a specific action plus feature area.

Example: `Add AI coaching response validation to simulator API`

### Description

Include the user or team problem, the current behavior, and the expected change.

Example:

The simulator can request AI coaching feedback, but the API response needs stricter validation so the frontend can render coaching output consistently. This ticket adds validation around coaching payloads, handles invalid provider responses, and documents the response contract for frontend consumers.

### Scope

- Files, modules, or pages expected to change
- Any areas intentionally out of scope
- Any dependencies on teammate work

### Acceptance Criteria

- The feature works through the intended user or API flow
- Error states are handled and visible where relevant
- Tests cover the main success path and at least one failure path
- Documentation is updated on the feature-focused page
- Jira ticket links to the PR and any relevant code/doc files

### Definition of Done

- Code is implemented and locally verified
- Automated tests pass or any skipped tests are explained
- PR has at least one requested teammate reviewer
- Reviewer feedback is addressed or explicitly resolved
- PR is linked in Jira
- Documentation includes the feature behavior, setup/usage notes, and visual evidence when useful
- Ticket has a completion comment summarizing what shipped and how it was verified

### Estimate

Add story points before work begins.

| Points | Use when |
|--------|----------|
| 1 | Small text, config, or isolated bug fix |
| 2 | Narrow code change with low uncertainty |
| 3 | Normal feature slice across one area with tests |
| 5 | Multi-file feature, API/UI contract change, or moderate uncertainty |
| 8 | Large cross-system change that should probably be split |

## PR Checklist

Add this to each Sprint 3 PR description.

```md
## Jira

- Ticket:

## What changed

-

## Verification

-

## Documentation

-

## Review

- [ ] Requested at least one teammate reviewer
- [ ] Addressed reviewer comments
- [ ] Jira ticket linked to this PR
- [ ] No self-approval used as the only review
```

## Documentation Rules

Keep Confluence organized around features instead of sprint identity or individual ownership.

| Prefer | Avoid |
|--------|-------|
| `AI Coach API Contract` | `Kyle Sprint 3 AI Work` |
| `Simulator Move Animation System` | `Sprint 3 Update 2` |
| `Authentication and Solve History` | `My Backend Progress` |

For each feature page, include:

- Purpose and user value
- Current behavior
- Architecture or data flow diagram when the feature crosses modules
- Screenshots, renderings, or short animation captures for UI-facing work
- API contract or key interfaces for backend-facing work
- Testing and verification notes
- Links to Jira tickets, PRs, and important files

## Weekly Operating Checklist

### Before Starting Work

- Ticket has a detailed description
- Ticket has story points
- Ticket has acceptance criteria and Definition of Done
- Ticket is linked to any parent epic or feature page
- Work is split small enough for review

### During Work

- Leave Jira comments for meaningful status changes or blockers
- Push commits with focused messages
- Update docs alongside code instead of at the end
- Capture screenshots or short clips while the feature is fresh

### Before Opening PR

- Run relevant tests
- Update the feature-focused documentation page
- Add the PR checklist
- Link the Jira ticket
- Request a teammate reviewer

### Before Merge

- Wait for at least one peer review on feature PRs
- Respond to reviewer comments
- Re-run tests after significant changes
- Add a Jira completion comment with verification evidence

## Sprint 3 Evidence Log

Use this table during the sprint so the final report is easy to assemble.

| Date | Ticket | Points | PR | Reviewer | Documentation | Verification |
|------|--------|--------|----|----------|---------------|--------------|
| | | | | | | |

## Example Jira Completion Comment

```md
Completed this ticket by adding response validation for AI coaching output in the API layer and covering valid and invalid provider responses with tests.

Verification:
- Ran backend API test suite
- Manually checked simulator coaching request flow

Links:
- PR:
- Documentation:
- Key files:
```
