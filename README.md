# PRISM

**Project Reporting & Insight System Manager**: an internal tool for the AI Team to track every POC account from first opportunity to the go / no-go decision.

> **Prototype.** PRISM starts completely empty: no people, no accounts. Everything you enter is stored in your own browser and nothing is sent to a server. A real backend (shared database, secure sign-in, push notifications) comes next.

## Try it

1. Open the site. The first time, it asks you to **Set up PRISM**: create the AI Team Lead account (name, work email, password).
2. In **Settings › Workspace › People and roles**, add your team with a role and a temporary password each. Share it with them privately; they can change it in My profile. The Team Lead can set a new password for anyone who forgets theirs.
3. Add the first account from **Accounts**.

Want to look around first? On a brand-new browser, click **Explore the demo workspace** on the setup screen: PRISM fills itself with sample data and signs you in as the sample Team Lead. The sign-in page then lists the sample people so you can switch roles. Already set up? **Settings › Workspace › Load sample data** adds 17 sample accounts and eight sample people (password `prism123`). **Erase all data** removes them again; your real team is never touched.

| Role | Can do |
|---|---|
| AI Team Lead | Sees every account, approves stages, plans the schedule, manages workspace settings |
| Account Manager | Their own accounts: updates, documents, approval requests |
| Developer | Accounts they're assigned to: updates and documents |
| Higher Management | Approves POC proposals and Go / No-Go decisions |

Tip: open two tabs and sign in as different people to see messages and notifications arrive live.

## Install it as an app

PRISM is a Progressive Web App:

- **iPhone / iPad:** open in Safari → Share → **Add to Home Screen**
- **Android:** open in Chrome → ⋮ → **Install app**
- **Computer:** click the install icon in the address bar (Chrome or Edge)

## What's inside

- 10-stage POC lifecycle with document gates and role-based approvals
- Dashboard with charts, pipeline board, schedule (calendar + timeline)
- Messaging (account threads, direct messages, groups), notifications, settings
- Plain HTML, CSS and JavaScript: no build step

## Run it locally

Serve the folder with any static web server, for example:

```
python -m http.server 8000
```

Then open http://localhost:8000.
