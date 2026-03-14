

# Two Changes: Bulk Find Emails + CV Builder Suggestion

## 1. Bulk "Find All Emails" Button in JobSelectStep

Add a button next to "Select All" / "Deselect All" that triggers `handleFindEmail` for every job that has no email or has low-confidence/unverified email.

**In `src/components/campaign/JobSelectStep.tsx`:**
- Add state: `bulkSearching` boolean
- Add `handleFindAllEmails` function that:
  - Filters jobs needing emails (`showFindButton` returns true)
  - Processes them in batches of 3 (to avoid overwhelming the edge function)
  - Updates jobs state as each result comes back
  - Shows a toast with summary: "Found X of Y emails"
- Add a `Mail` + `Search` icon button in the header bar next to Select All / Deselect All
- Show count of jobs missing emails on the button: "Find All Emails (12)"
- Disable while `bulkSearching` is true, show spinner

## 2. CV Builder Suggestion in Settings Documents Tab

**In `src/pages/Settings.tsx`**, in the CV upload area (the empty state around line 387-403):
- Below the "Upload CV" button, add a divider and a suggestion:
  - Text: "Don't have a CV yet?"
  - A link/button: "Create one with our CV Builder" that navigates to `/cv-builder`
- Use `useNavigate` (already imported) to link to the CV builder page
- Style: subtle text with a prominent link, using the `FileText` icon

