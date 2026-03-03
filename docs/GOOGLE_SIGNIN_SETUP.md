# Google Sign-In Setup

This app uses [NextAuth.js](https://next-auth.js.org) with the Google OAuth provider. To enable "Get Started" → Google Sign-In, you need to create OAuth credentials in Google Cloud Console.

## What You Need to Provide

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Random string for encrypting sessions. Generate with `npx auth secret` |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |

## Step-by-Step: Create Google OAuth Credentials

1. **Open Google Cloud Console**  
   Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)

2. **Select or create a project**  
   Use an existing project or create a new one.

3. **Configure the OAuth consent screen**  
   - Go to **APIs & Services** → **OAuth consent screen**
   - Choose **External** (or Internal for workspace-only)
   - Add app name, support email, and developer contact
   - Add `https://www.pdf-to-video.com` to **Authorized domains** (for production)
   - Save and continue

4. **Create OAuth 2.0 credentials**  
   - Go to **APIs & Services** → **Credentials**
   - Click **Create credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: e.g. "PDF to Video"
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (development)
     - `https://www.pdf-to-video.com` (production)
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://www.pdf-to-video.com/api/auth/callback/google` (production)
   - Click **Create**

5. **Copy the credentials**  
   You’ll see **Client ID** and **Client secret**. Add them to `.env.local`:

```env
AUTH_SECRET=<run: npx auth secret>
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
```

6. **Production**  
   For production, also set:

```env
AUTH_URL=https://www.pdf-to-video.com
```

## Flow

- **Get Started** → redirects to Google Sign-In
- After sign-in → redirects to `https://www.pdf-to-video.com/#upload`
- Signed-in users see **Get Started** as a direct link to `#upload`
