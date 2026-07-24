# BLOX Auth email templates — copy/paste into Supabase

**Dashboard:** Authentication → Email Templates

Do **not** change `{{ .ConfirmationURL }}` or `{{ .Token }}` — those are Supabase Go template variables.

| # | Dashboard template | Subject file | Body file |
|---|--------------------|--------------|-----------|
| 1 | Confirm signup | `01-confirm-signup.subject.txt` | `01-confirm-signup.html` |
| 2 | Reset password | `02-reset-password.subject.txt` | `02-reset-password.html` |
| 3 | Magic Link | `03-magic-link.subject.txt` | `03-magic-link.html` |
| 4 | Invite user | `04-invite-user.subject.txt` | `04-invite-user.html` |
| 5 | Change Email Address | `05-change-email.subject.txt` | `05-change-email.html` |
| 6 | Reauthentication | `06-reauthentication.subject.txt` | `06-reauthentication.html` |

For each: paste subject → paste HTML body → Save.
