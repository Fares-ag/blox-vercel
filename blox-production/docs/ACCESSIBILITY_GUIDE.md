# Accessibility Guide

## Overview

This guide outlines accessibility standards and practices for the Blox platform.

## WCAG 2.1 AA Compliance

We aim to meet WCAG 2.1 Level AA standards for all user-facing features.

### Key Requirements

1. **Perceivable**
   - Text alternatives for images
   - Captions for multimedia
   - Sufficient color contrast (4.5:1 for normal text)
   - Text resizable up to 200%

2. **Operable**
   - Keyboard accessible
   - No seizure-inducing content
   - Navigable interface
   - Input assistance

3. **Understandable**
   - Readable text
   - Predictable functionality
   - Input assistance

4. **Robust**
   - Compatible with assistive technologies

## Implementation Guidelines

### ARIA Labels

Always provide ARIA labels for interactive elements:

```tsx
<button aria-label="Close dialog">×</button>
<input aria-label="Search vehicles" />
```

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

```tsx
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</button>
```

### Color Contrast

- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- UI components: 3:1 contrast ratio

### Focus Management

- Visible focus indicators
- Logical tab order
- Skip links for main content

### Screen Reader Support

- Semantic HTML
- ARIA roles where needed
- Descriptive text for icons

## Testing

### Automated Testing

Run accessibility tests:

```bash
npm test -- --testNamePattern="accessibility"
```

### Manual Testing

1. Keyboard-only navigation
2. Screen reader testing (NVDA, JAWS, VoiceOver)
3. Color contrast checking
4. Zoom testing (200%)

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

