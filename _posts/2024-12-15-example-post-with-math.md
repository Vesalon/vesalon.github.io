---
layout: post
title: "An Example Post with Math"
date: 2024-12-15
math: true
---

This is an example blog post showing off some features. You can write in regular markdown and it just works.

## Math Support

Inline math works like this: $E = mc^2$ or $\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$.

Display math uses double dollar signs:

$$
\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}
$$

Or you can use the bracket notation for display math:

$$
\mathcal{L} = \int \left( \frac{1}{2} \partial_\mu \phi \partial^\mu \phi - V(\phi) \right) d^4x
$$

A matrix example:

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
$$

## Code Blocks

Code highlighting works too:

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Calculate first 10 Fibonacci numbers
for i in range(10):
    print(fibonacci(i))
```

And inline `code` looks like this.

## Regular Content

Just write paragraphs normally. **Bold text**, *italic text*, and [links](https://example.com) all work as expected.

- Bullet points
- Work fine
- As well

1. And numbered
2. Lists too
