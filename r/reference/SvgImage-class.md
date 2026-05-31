# SvgImage: wrapper for rendered SVG output

Returned by \[render_share_distribution()\] and
\[render_cluster_heatmap()\]. Mirrors the Python \`SvgImage\` dataclass
so cross-package parity tests can use a uniform attribute name
(\`content\`). Note that \[render_venn_svg()\] still returns a plain
\`character\` for backward compatibility with the v2.0.x public API; the
new plot renderers return \`SvgImage\` so callers can introspect
explicit \`width\` / \`height\` extents.

## Slots

- `content`:

  The SVG document as a string.

- `width`:

  Pixel width of the rendered SVG.

- `height`:

  Pixel height of the rendered SVG.
