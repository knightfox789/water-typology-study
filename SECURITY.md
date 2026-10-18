# Security

This repository publishes a static GitHub Pages site. There is no application backend,
authentication system, database, or server-side secret store in this release repository.

## Release security

Before publishing generated files, run:

```bash
python3 scripts/prepublish_security_check.py
```

The check rejects common release-time security regressions, including:

- `</script>` appearing in data that may later be embedded inside a script element;
- `javascript:` URLs;
- common committed credential/token patterns;
- external runtime JavaScript;
- `target="_blank"` links without `rel="noopener"`;
- loss of the site's baseline Content Security Policy directives; and
- direct use of `location.hash` as a CSS selector.

The workflow in `.github/workflows/security-checks.yml` runs the same check on pull
requests and pushes to `main`.

## Repository settings

For the CI check to act as a release gate, protect the `main` branch (or apply a
repository ruleset) and require the `static-security` status check before changes can
merge. Restrict bypass permission and write access to trusted maintainers/integrations.

## Generated data

The source packaging pipeline should escape less-trusted text before inserting it into
HTML. JSON embedded inside a `<script>` element should be serialized so that `<`
cannot form a literal `</script>` closing tag (for example, encode `<` as
`\\u003c`). Prefer `textContent` or DOM construction over `innerHTML` for text that
can originate outside the repository.

## Reporting

If you discover a security issue, do not publish secrets or sensitive proof-of-concept
data in a public issue. Contact the repository owner privately through an appropriate
GitHub contact channel.
