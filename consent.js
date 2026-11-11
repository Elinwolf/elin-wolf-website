// Basic consent: Google Analytics is not downloaded until explicit acceptance.
(() => {
  'use strict';
  const measurementId = 'G-BD74DCQGRV';
  const key = 'elinwolf.analytics-consent.v1';
  const disableKey = `ga-disable-${measurementId}`;
  const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  let choice = null;
  let analyticsFrame = null;
  let analyticsReady = false;
  let pageViewSent = false;
  let pendingCommands = [];
  let revision = 0;
  let returnFocus;
  const analyticsAllowed = () => choice === 'accepted' || choice === 'accepted-measurement';
  window[disableKey] = true;
  const readChoice = () => {
    try {
      const stored = localStorage.getItem(key);
      // Existing analytics-only acceptances never grant the new measurement purpose.
      return ['accepted', 'accepted-measurement', 'rejected'].includes(stored) ? stored : null;
    } catch (_) { return null; }
  };
  const clearAnalyticsCookies = (advertisingOnly = false) => {
    // Remove first-party GA cookies, including cookies from the previous ungated tag.
    const parts = location.hostname.split('.');
    const domains = ['', ...parts.map((_, i) => parts.slice(i).join('.'))];
    const paths = ['/', location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1)];
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (advertisingOnly && !/^_gcl(?:_|$)/.test(name)) return;
      if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl(?:_|$))/.test(name)) return;
      for (const domain of domains) for (const path of paths) {
        document.cookie = `${name}=; Max-Age=0; path=${path}${domain ? `; domain=${domain}` : ''}; SameSite=Lax`;
      }
    });
  };
  // Keep the SDK's timers and private buffers out of the page containing the form.
  // Destroying this browsing context on withdrawal also destroys those buffers.
  const command = function () {
    if (!analyticsAllowed()) return;
    if (analyticsReady) analyticsFrame.contentWindow.gtag(...arguments);
    else pendingCommands.push(Array.from(arguments));
  };
  window.gtag = command;
  const stopAnalytics = () => {
    window[disableKey] = true;
    analyticsReady = false;
    pendingCommands = [];
    const frame = analyticsFrame;
    analyticsFrame = null;
    if (!frame) return;
    const child = frame.contentWindow;
    child[disableKey] = true;
    // Prevent unload/pagehide handlers from flushing buffered hits during removal.
    // This CSP applies only to the SDK frame, never to FormSubmit or page assets.
    const policy = child.document.createElement('meta');
    policy.httpEquiv = 'Content-Security-Policy';
    policy.content = "default-src 'none'; connect-src 'none'; img-src 'none'";
    child.document.head.appendChild(policy);
    child.stop();
    frame.remove();
  };
  const enableAnalytics = () => {
    window[disableKey] = false;
    if (analyticsFrame) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    // A tiny, clipped viewport avoids a zero-height document being counted as scrolled.
    frame.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;border:0;opacity:0;clip-path:inset(100%);pointer-events:none';
    frame.title = 'Optional website analytics';
    frame.id = 'consented-analytics';
    // A real same-origin URL supports the SDK's protocol checks and first-party cookies.
    // This empty runtime document contains no user content or independent tracking.
    frame.src = 'analytics-frame.html';
    analyticsFrame = frame;
    frame.addEventListener('load', () => {
      if (analyticsFrame !== frame || !analyticsAllowed()) return;
      const child = frame.contentWindow;
      child.document.title = document.title;
      child[disableKey] = false;
      // Create gtag in the child realm so its dataLayer and callbacks belong there.
      const bootstrap = child.document.createElement('script');
      bootstrap.textContent = 'window.dataLayer=[]; function gtag(){dataLayer.push(arguments);}';
      child.document.head.appendChild(bootstrap);
      child.gtag('consent', 'default', denied);
      child.gtag('set', 'ads_data_redaction', true);
      child.gtag('set', 'url_passthrough', false);
      const advertising = choice === 'accepted-measurement' ? 'granted' : 'denied';
      child.gtag('consent', 'update', {
        ...denied, analytics_storage: 'granted', ad_storage: advertising, ad_user_data: advertising
      });
      child.gtag('js', new Date());
      child.gtag('config', measurementId, {
        page_location: location.href,
        page_title: document.title,
        page_referrer: document.referrer,
        send_page_view: !pageViewSent,
        allow_google_signals: false,
        allow_ad_personalization_signals: false
      });
      pageViewSent = true;
      analyticsReady = true;
      const tag = child.document.createElement('script');
      tag.async = true;
      tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      child.document.head.appendChild(tag);
      pendingCommands.forEach(args => child.gtag(...args));
      pendingCommands = [];
    }, { once: true });
    document.body.appendChild(frame);
  };
  const apply = value => {
    if (value === choice && revision) return;
    const previous = choice;
    choice = value;
    revision++;
    // Any purpose change destroys the old SDK buffers before a fresh runtime starts.
    // This includes withdrawing advertising measurement while retaining analytics.
    stopAnalytics();
    if (!analyticsAllowed()) clearAnalyticsCookies();
    else if (previous === 'accepted-measurement' && choice !== previous) clearAnalyticsCookies(true);
    if (analyticsAllowed()) enableAnalytics();
  };
  window.elinConsent = Object.freeze({
    snapshot: () => analyticsAllowed() ? revision : null,
    allows: token => token !== null && token === revision && analyticsAllowed()
  });
  apply(readChoice());

  document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('consent-panel');
    const status = document.getElementById('consent-status');
    const settings = document.querySelectorAll('[data-consent-settings]');
    const advertising = panel.querySelector('[data-consent-advertising]');
    const updateStatus = () => {
      advertising.checked = choice === 'accepted-measurement';
      status.textContent = choice === 'accepted-measurement'
        ? 'Analytics and advertising measurement are accepted. Personalized advertising remains off.'
        : analyticsAllowed() ? 'Analytics is accepted. Advertising measurement is off.'
          : 'Analytics and advertising measurement are off.';
    };
    const hide = () => {
      panel.hidden = true;
      if (panel.contains(document.activeElement)) (returnFocus || settings[0])?.focus();
    };
    const choose = value => {
      try { localStorage.setItem(key, value); } catch (_) { /* Current-page choice still works. */ }
      apply(value);
      updateStatus();
      hide();
    };
    settings.forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
        returnFocus = button;
        updateStatus();
        panel.hidden = false;
        panel.querySelector('[data-consent-reject]').focus();
      });
    });
    panel.querySelector('[data-consent-accept]').addEventListener('click', () => choose(advertising.checked ? 'accepted-measurement' : 'accepted'));
    panel.querySelector('[data-consent-reject]').addEventListener('click', () => choose('rejected'));
    panel.querySelector('[data-consent-close]').addEventListener('click', hide);
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); hide(); }
    });
    const sync = () => { apply(readChoice()); updateStatus(); };
    window.addEventListener('storage', event => { if (event.key === key || event.key === null) sync(); });
    window.addEventListener('pageshow', event => { if (event.persisted) sync(); });
    updateStatus();
    panel.hidden = choice !== null;
  });
})();
