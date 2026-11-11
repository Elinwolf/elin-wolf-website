# Advertising readiness — approved website update

The owner approved committing, pushing and publishing this update to the existing GitHub Pages website. No account setting change, reactivation or spending is authorized. Preserve existing Google Ads account **493-011-1354**, associated with **music.by.elink@gmail.com**, including its SEK currency and Central European time zone. The planned Search Ads test budget remains **$200 USD equivalent**, not SEK 200; no budget has been entered.

## Final consent choices

`consent.js` remains the small shared controller, with no new dependency or paid platform.

| Visitor choice | analytics_storage | ad_storage | ad_user_data | ad_personalization |
| --- | --- | --- | --- | --- |
| No choice / Reject all | denied | denied | denied | denied |
| Accept selected, optional checkbox unchecked | granted | denied | denied | denied |
| Accept selected, advertising measurement explicitly checked | granted | granted | granted | denied |

- The optional, initially unchecked advertising-measurement checkbox explains advertising cookies and sharing visit, ad-click and successful-inquiry data with the linked Ads account. It is separate from personalized advertising, which is never offered or enabled.
- Analytics is the base choice; advertising measurement uses that Analytics runtime and cannot be enabled without Analytics. The two buttons, Accept selected and Reject all, have equal styling and size. Closing without choosing grants nothing. Privacy choices in every footer lets a visitor uncheck advertising measurement and accept again to retain only Analytics, or reject both.
- No geolocation exceptions. Before acceptance there is no SDK download, Analytics collection or consent ping. Google Signals and `allow_ad_personalization_signals` remain false in all modes. Ads-data redaction remains on and URL passthrough off. No separate Ads tag, remarketing, enhanced conversions or user-provided personal data is added.
- The existing `elinwolf.analytics-consent.v1` localStorage key accepts `accepted`, `rejected`, and the new explicit `accepted-measurement` value. Old `accepted` preferences retain Analytics only; they never silently opt in to advertising measurement. Unknown values fail closed. Preferences contain no inquiry details, visitor identifier or central consent receipt. No expiry is imposed. Storage failures restrict the choice to the current page.
- Same-origin storage events and back/forward-cache restoration synchronize choices. Keyboard controls and Escape preserve the existing nonmodal focus behavior. The panel may scroll at small widths but does not reflow website content.

## Preserved withdrawal protection

The actual Google SDK previously attempted to send a buffered scroll event about 2.4 seconds after withdrawal. The GA disable flag and emptying dataLayer alone did not prevent it.

The existing `analytics-frame.html` isolation fix is preserved. Every change of accepted purpose closes the inquiry gate, stops the old SDK, clears pending commands, applies frame-only CSP (`default-src 'none'; connect-src 'none'; img-src 'none'`), and removes the browsing context. This destroys buffered events, timers and unload handlers before any new consent runtime starts. No parent-page networking or FormSubmit methods are patched.

- Full withdrawal expires accessible first-party `_ga*`, `_gid`, `_gat*` and `_gcl*` cookies.
- Advertising-only withdrawal clears `_gcl*` cookies and starts a fresh Analytics-only runtime. Analytics cookies are retained while Analytics remains accepted, preserving continuity rather than resetting the visitor on every page.
- Reacceptance never replays discarded events. One page view is configured per main-page document, including across purpose changes. The page URL/title/referrer explicitly describe the parent page.
- Withdrawal cannot recall a request already sent or delete data already received by Google. Other-domain and HttpOnly cookies are outside JavaScript control.
- The hidden, clipped, nonindexable runtime does not independently track when opened. Automatic parent-page scroll, click and form micro-events are not bridged; page views and confirmed inquiries are the intended measurements. Engagement reports may differ from the old implementation.

## Booking behavior preserved

Service buttons preselect the correct event type; generic entry points require selection. FormSubmit remains independent of consent. `generate_lead` requires HTTP success plus FormSubmit `success: true` or `"true"`. Its custom parameter is the allowlisted `event_type` only, never personal form fields.

The consent revision captured at submission must still match on success. Changing either purpose while an inquiry is in flight suppresses that event, even after reacceptance. Inquiries made without consent are not replayed. The disabled submit guard prevents duplicate submissions within the form; this is not person-level or cross-tab lead deduplication. FormSubmit acceptance is not proof of inbox delivery or a qualified booking.

## Publication policy

The owner confirmed **Elin Wolf is responsible** for personal information; privacy requests use music.by.elink@gmail.com. Visible draft wording has been removed from `privacy.html`. The owner approved publication and removal of the privacy page’s noindex directive. The finalized policy is discoverable through existing site links; the sitemap is unchanged. The SDK runtime remains noindex.

Disclosures cover:
- Optional Analytics and separately selected advertising measurement; all consent choices and withdrawal limits.
- Verified GA4 retention: event data two months; user data fourteen months, reset on new activity; aggregate reports are separate.
- FormSubmit processing and forwarding inquiries to Gmail, independent of Analytics consent.
- Gmail correspondence retained for business records, future bookings and returning clients, with no invented deletion period.
- GitHub Pages hosting, Google Fonts and jsDelivr requests independent of optional tracking consent.
- Local video previews and links to YouTube/Instagram, with no automatically loaded embedded players.

The policy describes verified operation and links provider policies. It does not promise a provider-specific deletion deadline, certify legal compliance, or claim a dated centralized consent log. FormSubmit's unpublished processing details and jurisdiction-specific legal requirements remain outside what this technical implementation can verify; no unsupported promises have been added. There is no remaining factual identity question from the owner.

## Verified account findings — unchanged, no further audit

The authenticated Safari audit confirmed G-BD74DCQGRV / property 478763122 and linked Ads account 493-011-1354. Google Signals is off. Link-level personalized advertising is off; property-wide personalization is still permitted in 307 regions. `generate_lead` is received but not a key event. `event_type` is not registered as a custom dimension.

The old Primary Request quote action (7046459278) measures a `/contact` page load via `ads_conversion_Request_quote_1`, not successful submission. It counts Every conversion, uses data-driven attribution for Google paid channels, 90-day click / 3-day engaged-view windows, and fallback value SEK 1. It has no recent stream data. Auto-tagging is off. The account is canceled and offers reactivation; no reactivation was attempted.

These are **campaign-readiness tasks, not reasons to withhold an otherwise approved website deployment**. After separate account-setting approval: make the obsolete page-load action Secondary and exclude it from bidding goals; configure exactly one Primary successful-inquiry conversion based on `generate_lead`, with One counting per ad interaction; enable auto-tagging; keep Signals/personalization off and consider disabling property-wide personalization. Register event_type for optional category reporting. Avoid fabricated booking revenue as a conversion value.

The new explicit measurement choice enables the relevant consent signals but does not prove Ads receipt or attribution. Analytics-only visitors still have advertising signals denied, and visitors rejecting both are not measured. Modeling or complete conversion coverage is not promised. Reactivation/campaign launch remain separately approval-gated; verify all campaigns before any future reactivation because enabled campaigns may resume.

## Testing

Run with the bundled Node executable and existing Playwright dependency:

```
node tests/advertising-readiness.cjs
node tests/consent.cjs
node tests/consent-real-sdk.cjs
```

Prior baseline: 141 booking checks + 315 consent checks + 201 actual-SDK assertions = **657 passing checks**. The original assertions are retained. New checks cover the advertising choice, migration of old acceptances, keyboard selection, consent persistence, cross-tab downgrade, cookie cleanup, the exact granted/denied signals, and actual-SDK advertising-only withdrawal/reacceptance.

All suites cover 320px, 390px and 1440px; the consent suites cover homepage, Services and privacy. The actual-SDK suite repeats its existing success/failure, duplicate submission, pending submission, delayed event, unload, navigation, full withdrawal and reacceptance tests for both acceptance modes. It additionally tests queued/delayed activity during advertising-only withdrawal, Analytics-only continuation and measurement reacceptance.

Consented SDK traffic can use analytics.google.com and Google/DoubleClick collection hosts as well as google-analytics.com. The test intercepts collection across these hosts and checks every non-SDK external attempt during withdrawal, rather than assuming a single host. Ordinary event batching is allowed six seconds; withdrawal checks still prohibit any new external collection attempt. A synthetic, locally intercepted gclid/UTM URL confirms the parent campaign URL is forwarded.

All collection and FormSubmit requests are intercepted. Only the public Google SDK script is downloaded; all other external requests are blocked or mocked. No real inquiry or production Analytics event is sent. Chromium is the test engine; this is not a Safari/WebKit implementation certification. External fonts are blocked, so screenshots use fallback fonts. No new performance benchmark or broad SEO audit is needed for this focused change.

Final results: **1,047 passing checks** — 141 booking checks, 405 mocked consent checks and 501 actual-SDK assertions (167 per viewport). The actual-SDK matrix passed at 320px, 390px and 1440px for both Analytics-only and advertising-measurement acceptance, on all three pages. Zero external collection attempts were observed in the tested full-withdrawal and advertising-only-withdrawal windows. Mobile/desktop consent screenshots were visually reviewed. JavaScript syntax and `git diff --check` pass. SDK SHA-256: `37a28f923079697193cb5dd5b3de24836313eb221d77c81e20e7ddbc10c9b78c`.

No known technical website-deployment blocker remains. Explicit publication approval has now been received. Account configuration and real end-to-end attribution remain separate pre-campaign tasks, not completed by these intercepted tests.

## Approved publication steps

1. Review the final local diff and approve website publication. Confirm the three suites pass and `git diff --check` is clean.
2. Stage only the release files: index.html, services.html, script.js, styles.css, consent.js, analytics-frame.html, privacy.html, ADVERTISING-READINESS.md and the three tests/*.cjs files. Do not include unrelated trackers, node_modules, output directories or temporary files.
3. Commit the reviewed website changes, push the approved main-branch update to Elinwolf/elin-wolf-website, and wait for the GitHub Pages workflow to succeed.
4. Check the published assets and privacy controls on both marketing pages and privacy.html. Keep Analytics collection intercepted during browser validation. A real end-to-end event or inquiry requires explicit authorization.
5. Treat conversion setup, auto-tagging, personalization account settings, account reactivation, campaign creation and the $200 USD-equivalent test as separate approval steps. Website publication alone authorizes none of them.

## Technical references

- Google consent behavior: https://support.google.com/google-ads/answer/13802165
- Consent implementation: https://developers.google.com/tag-platform/security/guides/consent
- Personalization controls: https://support.google.com/analytics/answer/9626162
- GA4 conversion import: https://support.google.com/google-ads/answer/2375435
- Provider disclosures are linked directly from privacy.html.
