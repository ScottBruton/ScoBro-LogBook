# OAuth Setup Guide for Calendar Integration

## Overview

The ScoBro Logbook supports calendar integration with Google Calendar and Microsoft Outlook through OAuth 2.0. This guide explains how to set up the necessary OAuth credentials.

## Why OAuth?

OAuth 2.0 is the industry standard for secure authentication. Instead of asking for your email password directly, it:

1. **Redirects you to Google/Microsoft's secure login page**
2. **You enter your credentials on their official site**
3. **You grant permission for the app to access your calendar**
4. **The app receives secure tokens to access your calendar data**

This is much safer than storing your email password in the app.

## Google Calendar Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "ScoBro Logbook"
4. Click "Create"

### 2. Enable Google Calendar API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (for development)
   - `https://yourdomain.com/auth/google/callback` (for production)
5. Click "Create"
6. Copy the **Client ID**

### 4. Configure Environment Variable

Add to your `.env` file:
```env
VITE_GOOGLE_CLIENT_ID=104771774918-7p3s0uo9g704q08dqg5luvpimtkj3g2e.apps.googleusercontent.com
```

## Microsoft Outlook Setup

### 1. Create Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Enter name: "ScoBro Logbook"
5. Set redirect URI: `http://localhost:3000/auth/microsoft/callback`
6. Click "Register"

### 2. Configure API Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Add these permissions:
   - `Calendars.Read`
   - `Calendars.ReadWrite`
6. Click "Grant admin consent"

### 3. Create Client Secret (Optional)

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Add description and expiration
4. Copy the **Secret Value**

### 4. Configure Environment Variable

Add to your `.env` file:
```env
VITE_MICROSOFT_CLIENT_ID=4c0f6b17-daab-4acc-abda-f904a01ed80d
VITE_MICROSOFT_CLIENT_SECRET=c2e09045-3a58-49ab-a65e-c6c152300d6c
```

## How It Works

### 1. User Clicks "+ Google" or "+ Microsoft"

The app opens a popup window to the OAuth provider's login page.

### 2. User Logs In

You enter your email and password on Google's or Microsoft's official login page.

### 3. Grant Permissions

The provider asks if you want to allow "ScoBro Logbook" to access your calendar.

### 4. Authorization Code

After you grant permission, the provider redirects back with an authorization code.

### 5. Token Exchange

The app exchanges the authorization code for access tokens.

### 6. Calendar Access

The app can now read your calendar events using the access tokens.

## Security Benefits

- **No password storage**: Your email password is never stored in the app
- **Secure tokens**: Access tokens are encrypted and can be revoked
- **Limited permissions**: The app only accesses what you explicitly grant
- **Official authentication**: You log in through Google/Microsoft's secure systems

## Troubleshooting

### "OAuth not configured" Error

This means the environment variables are not set. Check your `.env` file and restart the app.

### "Invalid redirect URI" Error

Make sure the redirect URI in your OAuth app matches exactly:
- Development: `http://localhost:3000/auth/google/callback`
- Production: `https://yourdomain.com/auth/google/callback`

### "Insufficient permissions" Error

Make sure you've granted the necessary API permissions in your OAuth app configuration.

### Popup Blocked

Some browsers block popups. Allow popups for your domain or try a different browser.

## Development vs Production

### Development
- Use `http://localhost:3000` for redirect URIs
- Client secrets are optional for development

### Production
- Use your actual domain for redirect URIs
- Client secrets are recommended for production
- Consider using environment-specific OAuth apps

## Next Steps

Once OAuth is configured:

1. **Test the connection** by clicking "+ Google" or "+ Microsoft"
2. **Grant permissions** when prompted
3. **Verify calendar sync** by checking if events appear
4. **Configure sync settings** like frequency and date ranges

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your OAuth app configuration
3. Ensure environment variables are set correctly
4. Test with a different browser or incognito mode

The OAuth flow is designed to be secure and user-friendly, following industry best practices for calendar integration.
