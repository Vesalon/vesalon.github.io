# Personal Website (Jekyll)

A Jekyll-based personal website with animated tessellation background.

## Structure

```
├── _config.yml          # Site configuration
├── _layouts/            # Page templates
│   ├── base.html        # Base template (nav, footer, head)
│   ├── home.html        # Home page with tessellation
│   ├── page.html        # Standard pages
│   ├── post.html        # Blog posts
│   └── blog.html        # Blog listing
├── _includes/           # Reusable HTML snippets
│   └── nav.html         # Navigation bar
├── _posts/              # Blog posts (markdown)
├── assets/
│   ├── css/
│   ├── js/
│   └── cv.pdf           # Your CV (add this)
├── index.md             # Home page content
├── projects.md          # Projects page
└── blog.md              # Blog listing page
```

## Writing Blog Posts

Create a new file in `_posts/` with the format `YYYY-MM-DD-title.md`:

```markdown
---
layout: post
title: "Your Post Title"
date: 2024-12-15
math: true  # Enable this for LaTeX math support
---

Your content here. Use $inline math$ and $$display math$$.
```

## Math Support

Add `math: true` to any page's front matter to enable MathJax:

- Inline: `$E = mc^2$`
- Display: `$$\int_0^\infty e^{-x^2} dx$$`

## Local Development

```bash
# Install dependencies
bundle install

# Run local server
bundle exec jekyll serve

# Visit http://localhost:4000
```

## Deploying to GitHub Pages

1. Push this to a repo named `username.github.io`
2. GitHub Pages will automatically build and deploy
3. Or push to any repo and enable Pages in Settings → Pages

## Adding Your CV

Place your CV PDF at `assets/cv.pdf`. The nav link points there directly.

## Customization

- Edit `_config.yml` to change site title/description
- Edit `_includes/nav.html` to modify navigation
- Edit `assets/css/style.css` for styling
- Edit `_layouts/` files to change page structure
