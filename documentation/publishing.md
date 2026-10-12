# Publishing this space

This folder is a GitBook space. It is not connected to a GitBook site yet, and nothing here has been published.

## Layout

Git Sync expects this shape. The site map at the repository root points a space at this directory:

```
gitbook-docs.yaml          # site map, repository root
documentation/
  .gitbook.yaml            # this space
  README.md                # first page
  SUMMARY.md               # sidebar
  .gitbook/vars.yaml       # space variables
```

`SUMMARY.md` is the navigation. Each page is listed once. GitBook reads `README.md` as the first page.

## GitBook MCP

Editing a live GitBook space uses GitBook MCP, not the read-only server that a published site grows later.

* Endpoint: `https://mcp.gitbook.com/mcp`
* Transport: streamable HTTP. `stdio` and SSE are not supported.
* Opening that URL in a browser returns an error. An MCP client calls it.
* Sign in with OAuth, or send a personal access token as `Authorization: Bearer <token>`.
* Tokens are created at [GitBook developer settings](https://app.gitbook.com/account/developer). Do not commit a token.

After a site is published, readers get a separate read-only server at `{docs-site-url}/~gitbook/mcp`. That server does not see drafts. It does not exist until the site is published.

## Before a sync

1. Read the pages and correct anything that has changed on the site.
2. Keep `.gitbook/vars.yaml` matched to [Contracts](contracts.md).
3. Connect GitBook MCP or GitHub Sync, and open a change request.
4. Publish only after the change request is accepted.

Do not point Git Sync at the repository root without `gitbook-docs.yaml`. The app is not the docs space. The space directory is `documentation/`.
