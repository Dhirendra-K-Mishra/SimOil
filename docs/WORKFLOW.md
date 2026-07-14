# Workflow & Git

Recommended workflow for feature development, reviews, and releases.

Branching model (Gitflow-lite)
- `main` — stable production-ready code
- `develop` — integration branch (optional)
- feature branches: `feature/<short-desc>`
- hotfix branches: `hotfix/<issue>`

Commit messages
- Use short, present-tense summaries. Example: `feat(sim): add depot capacity control`.
- For larger changes, include a longer description in the PR body.

Pull request checklist
- Title and description describe the change and reason.
- Link to relevant issue or requirement.
- Includes steps to run locally and any DB changes.
- Passes linting and tests (if applicable).
- Size: prefer small, reviewable PRs.

Code review guidelines
- Review for correctness, readability, and test coverage.
- Check API contract changes carefully and update docs.

Releases
- Tag releases on `main` with semantic versioning (vMAJOR.MINOR.PATCH).
- Update `CHANGELOG.md` with a short summary per release.

Hotfix process
- Create `hotfix/<id>` from `main`, apply fix, open PR targeted at `main` and `develop` (if using), and tag release after merge.
