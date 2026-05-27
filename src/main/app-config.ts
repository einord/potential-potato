// Central place to configure built-in app settings for the main process.
// Comments are in English per project rules.

// Repo to check for updates (format: "owner/repo").
// Change this to your actual repository.
export const UPDATE_REPO = 'jonte/potential-potato'

// Base URL for the release-hosting API. Both GitHub
// (https://api.github.com) and Forgejo/Gitea (https://your-forgejo/api/v1)
// expose a compatible "/repos/{owner}/{repo}/releases/latest" endpoint
// with matching tag_name + assets[].{name,browser_download_url,size} fields,
// so the updater only needs the base URL swapped.
export const UPDATE_API_BASE = 'https://forgejo.nyqvist.app/api/v1'
