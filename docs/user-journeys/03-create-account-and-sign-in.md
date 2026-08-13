# 03 — Create an Account & Sign In

Personal areas (orders, collection, wishlist, rewards, account, checkout)
require an account. This journey covers creating one, the password rules, and
signing in — including the live password checklist.

## Opening the sign-in modal

Click the **sign-in** icon in the top bar (right side). A modal opens with
**Sign In** and **Create Account** tabs.

![Sign-in modal](images/13-sign-in-modal.png)

## Creating an account

1. Switch to the **Create Account** tab.
2. Fill in **Name**, **Email** and **Password**.
3. As you type, a **live checklist** shows each password requirement and
   marks it met/unmet — the rules come from the backend config, not the UI.

> **Password rules** (from `config/app.toml [passwordPolicy]`):
> at least 8 characters, use 3 of lowercase/uppercase/number/symbol, no
> repeated characters, no common words or sequences, not too predictable.

If the password is weak, submitting shows the **specific** reason (e.g.
"Password must be at least 8 characters" or "This password is too common")
inline — never a generic error.

## Signing in

Use the test user (see [README](README.md#test-user-dev-environment)):

| Field | Value |
|---|---|
| Email | `test@vault.io` |
| Password | `Str0ng!Passw0rd` |

Fill the **Sign In** tab and submit. The modal closes and the top bar now shows
your account menu; your cart, wishlist, collection and rewards load from the
backend automatically.

![Signed in](images/14-signed-in.png)

## Next

→ [04 — Shop & checkout](04-shop-and-checkout.md)
