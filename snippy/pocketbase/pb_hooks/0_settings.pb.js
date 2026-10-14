// Snippy settings for PocketBase.
// This handles settings for the Snippy app.

/// <reference path="../pb_data/types.d.ts" />

// Bootstrap the Snippy app.
onBootstrap((e) => {
  e.next();
  const app = e.app;
  try {
    const settings = app.settings();
    settings.meta.appName = 'Snippy';

    const appUrl = $os.getenv('PB_APP_URL') || '';
    if (appUrl) {
      settings.meta.appURL = appUrl.replace(/\/$/, '');
    }

    const from = $os.getenv('PB_SMTP_FROM') || '';
    if (from) {
      settings.meta.senderAddress = from;
    }
    settings.meta.senderName = $os.getenv('PB_SMTP_FROM_NAME') || 'Snippy';

    if (settings.meta.resetPasswordTemplate) {
      settings.meta.resetPasswordTemplate.actionUrl = '{APP_URL}/reset-password?token={TOKEN}';
    }
    if (settings.meta.verificationTemplate) {
      settings.meta.verificationTemplate.actionUrl = '{APP_URL}/login?verified=1';
    }
    if (settings.meta.confirmEmailChangeTemplate) {
      settings.meta.confirmEmailChangeTemplate.actionUrl = '{APP_URL}/settings';
    }

    const host = $os.getenv('PB_SMTP_HOST') || '';
    if (host) {
      settings.smtp.enabled = true;
      settings.smtp.host = host;
      settings.smtp.port = Number($os.getenv('PB_SMTP_PORT') || 587);
      settings.smtp.username = $os.getenv('PB_SMTP_USER') || '';
      settings.smtp.password = $os.getenv('PB_SMTP_PASS') || '';
      settings.smtp.tls = ($os.getenv('PB_SMTP_TLS') || 'true') !== 'false';
    } else {
      settings.smtp.enabled = false;
    }

    app.save(settings);
  } catch (err) {
    console.log('snippy settings save failed:', err);
  }

  try {
    // Setup OAuth providers.
    function envOauthProvider(name, displayName, idKey, secretKey) {
      const clientId = $os.getenv(idKey) || '';
      const clientSecret = $os.getenv(secretKey) || '';
      if (!clientId || !clientSecret) return null;
      return {
        name,
        clientId,
        clientSecret,
        displayName,
        pkce: true,
      };
    }

    const users = app.findCollectionByNameOrId('users');
    const managed = { github: true, google: true };
    const oauth2 = users.oauth2;
    const existing = oauth2 && oauth2.providers ? oauth2.providers : [];
    const providers = [];
    for (let i = 0; i < existing.length; i++) {
      const p = existing[i];
      if (p && p.name && !managed[p.name]) providers.push(p);
    }
    // Add GitHub OAuth provider.
    const github = envOauthProvider(
      'github',
      'GitHub',
      'PB_GITHUB_CLIENT_ID',
      'PB_GITHUB_CLIENT_SECRET'
    );
    // Add Google OAuth provider.
    const google = envOauthProvider(
      'google',
      'Google',
      'PB_GOOGLE_CLIENT_ID',
      'PB_GOOGLE_CLIENT_SECRET'
    );
    // Add OAuth providers to the users collection.
    if (github) providers.push(github);
    if (google) providers.push(google);
    users.oauth2.providers = providers;
    users.oauth2.enabled = providers.length > 0;
    app.save(users);
    console.log('snippy oauth providers:', providers.length);
  } catch (err) {
    console.log('snippy oauth bootstrap failed:', err);
  }
});
