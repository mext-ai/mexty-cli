# GitHub OAuth Setup Guide

This guide explains how to set up and use GitHub OAuth authentication in the MEXTY CLI to enable access to private block repositories.

## Overview

The GitHub OAuth integration allows users to:
- Clone private block repositories owned by their organization
- Access blocks they've purchased or have permission to view
- Seamlessly authenticate without manual token management

## Backend Setup

### 1. Register a GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: MEXTY CLI
   - **Homepage URL**: https://mexty.ai
   - **Authorization callback URL**: 
     - Production: `https://api.mexty.ai/api/auth/github/callback`
     - Development: `http://localhost:3001/api/auth/github/callback`
4. Click "Register application"
5. Note your **Client ID** and generate a **Client Secret**

### 2. Configure Environment Variables

Add these to your backend `.env` file:

```bash
# GitHub OAuth Configuration

```

For development:
```bash
GITHUB_REDIRECT_URI=http://localhost:3001/api/auth/github/callback
```

### 3. Database Migration

The User model has been updated with the following fields:
- `githubAccessToken` (encrypted, select: false)
- `githubUsername`
- `githubId`
- `githubTokenExpiresAt`

No migration script is needed as these fields are optional and will be populated when users connect GitHub.

## CLI Setup

### 1. Install Dependencies

The CLI needs the `open` package to launch the browser for OAuth:

```bash
cd mexty-cli
npm install open@^8.4.2
```

Update `package.json`:
```json
{
  "dependencies": {
    "open": "^8.4.2"
  }
}
```

### 2. Build the CLI

```bash
npm run build
```

## Usage

### Connect GitHub Account

```bash
mexty github-login
```

This will:
1. Request an OAuth URL from the backend
2. Open your browser to GitHub authorization page
3. Redirect back to the backend after authorization
4. Store your GitHub access token securely
5. Poll for connection status and confirm success

### Check GitHub Status

```bash
mexty github-status
```

Shows whether GitHub is connected and displays your GitHub username.

### Disconnect GitHub

```bash
mexty github-disconnect
```

Removes your GitHub access token from the system.

### Clone Private Repositories

Once GitHub is connected, the `mexty create` command will automatically use your GitHub token to clone private repositories:

```bash
mexty create "My Private Block"
```

The CLI will:
1. Create the block on the backend
2. Check if GitHub is connected
3. Inject your GitHub token into the clone URL
4. Clone the private repository

## API Endpoints

### Backend Routes

All routes are under `/api/auth`:

- `GET /github/url` - Get GitHub OAuth authorization URL (requires auth)
- `GET /github/callback` - GitHub OAuth callback (public)
- `GET /github/status` - Check GitHub connection status (requires auth)
- `GET /github/token` - Get GitHub access token for CLI (requires auth)
- `POST /github/disconnect` - Disconnect GitHub account (requires auth)

### Security Considerations

1. **Token Storage**: GitHub tokens are stored in the database with `select: false` to prevent accidental exposure
2. **State Validation**: OAuth state parameter includes user ID and timestamp to prevent CSRF attacks
3. **Token Scope**: Requests only `repo` scope for repository access
4. **Expiration**: Tokens are marked as expiring after 1 year (configurable)
5. **HTTPS Only**: In production, cookies are secure and HTTPS-only

## Error Handling

### Common Errors

1. **"GitHub not connected"**
   - Solution: Run `mexty github-login`

2. **"Authentication required"**
   - Solution: Run `mexty login` first

3. **"GitHub OAuth is not configured on the server"**
   - Solution: Admin needs to set up GitHub OAuth app and add credentials to backend

4. **"Repository not found"**
   - Could be a private repository - ensure GitHub is connected
   - Could be an incorrect URL
   - User might not have access to the repository

## Flow Diagram

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│   CLI   │                    │ Backend │                    │ GitHub  │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │ mexty github-login           │                              │
     ├──────────────────────────────>                              │
     │                              │                              │
     │ GET /api/auth/github/url     │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │ Open browser with URL        │                              │
     │──────────────────────────────┼─────────────────────────────>│
     │                              │                              │
     │                              │ GET /callback?code=xxx       │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │                              │ POST /oauth/access_token     │
     │                              │─────────────────────────────>│
     │                              │                              │
     │                              │ access_token                 │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │                              │ Store token in DB            │
     │                              │                              │
     │ Poll: GET /api/auth/github/status                          │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │ connected: true              │                              │
     │──────────────────────────────┤                              │
     │                              │                              │
     │ ✅ Success!                   │                              │
     │                              │                              │
```

## Development Tips

### Testing Locally

1. Start backend: `npm run dev`
2. Use ngrok for callback URL:
   ```bash
   ngrok http 3001
   ```
3. Update GitHub OAuth app callback URL to ngrok URL
4. Set `GITHUB_REDIRECT_URI` in `.env` to ngrok URL

### Debugging

Enable verbose logging:
```bash
DEBUG=* mexty github-login
```

Check stored auth data:
```bash
cat ~/.mext/auth.json
```

## Troubleshooting

### Token Expired
If you see "GitHub token expired":
```bash
mexty github-disconnect
mexty github-login
```

### Browser Not Opening
If the browser doesn't open automatically, copy the URL from the terminal and paste it into your browser.

### Multiple GitHub Accounts
Each MEXTY user account can connect one GitHub account at a time. To switch:
```bash
mexty github-disconnect
mexty github-login
```

## Future Enhancements

- [ ] Support for GitLab and Bitbucket
- [ ] Fine-grained token permissions
- [ ] Token refresh mechanism
- [ ] Multiple GitHub account support per user
- [ ] Organization-level GitHub integration

