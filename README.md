# PRISM

**Project Reporting & Insight System Manager**: an internal tool for the AI Team to track every POC account from first opportunity to the go / no-go decision.

> **Prototype.** The workspace starts empty and everything you enter is stored in your own browser. Sign-in uses test users, and nothing is sent to a server. The Team Lead can load sample data (or erase everything) in Settings › Workspace. A real backend (shared database, secure sign-in, push notifications) comes next.

## Try it

Open the site, then pick a test user on the sign-in page (the password is filled in for you). Start as the AI Team Lead to set up your team and add the first account.

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
