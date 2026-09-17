# Day Ahead repository instructions

- This local Git repository is the source of truth for Day Ahead.
- The GitHub remote is `blackmoresam/day-ahead`.
- Never use ChatGPT Sites, create a Sites project, deploy through Sites, or treat Sites as a source of truth.
- Make code changes only within this repository.
- Cloudflare is the production hosting environment.
- Pushes to the GitHub `main` branch automatically build and deploy to Cloudflare.
- Do not modify Cloudflare deployment configuration, bindings, environment variables, secrets, D1 configuration, cron triggers, or other production infrastructure unless the user explicitly requests it.
- For normal development, make and test the requested changes locally first.
- Do not commit or push changes until the user explicitly approves the completed change.
- When the user approves a change, commit it with a clear descriptive message and push it to `main`.
- Never expose, print, commit, or store production secrets or credentials in the repository.
- Preserve existing working integrations, including Tesla, National Highways, TfL, weather, D1, and web push, unless the requested change specifically concerns them.
