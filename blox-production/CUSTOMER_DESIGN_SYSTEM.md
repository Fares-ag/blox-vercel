# Customer Side Design System - Minimalistic & Professional

Based on the clean vehicle card design, this document defines the design patterns to be applied across the entire customer-facing application.

## 🎨 Design Principles

### 1. **Minimalism First**
- Clean, uncluttered layouts
- Generous white space (Light Grey backgrounds)
- Minimal borders - use subtle shadows for depth
- No unnecessary decorative elements

### 2. **Consistent Typography Hierarchy**
- **Headlines (H1)**: 32px, Bold (700), Blox Black
- **Subline (H2)**: 28px, Medium (700), Blox Black
- **Section Titles (H3-H5)**: 18-20px, Semi-bold (600), Blox Black
- **Body Copy**: 14px, Regular (400), Blox Black or Dark Grey
- **Annotations**: 12px, Regular (400), Dark Grey

### 3. **Card Design Pattern** (Matching Vehicle Cards)

#### Light Card (Default)
- Background: Light Grey (#F3F0ED)
- Border: None
- Shadow: Subtle (`var(--card-shadow)`)
- Border Radius: 16px (`var(--radius-card)`)
- Padding: 24px (`var(--spacing-lg)`)
- Text: Blox Black for headings, Dark Grey for secondary text

#### Dark Card (For Content Sections)
- Background: Blox Black (#0E1909)
- Border: None
- Shadow: Subtle (`var(--card-shadow)`)
- Border Radius: 16px
- Padding: 24px
- Text: Light Grey for all text

### 4. **Spacing System**
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px
- 2XL: 48px

### 5. **Color Usage**
- **Lime Yellow (#DAFF01)**: Active states, CTAs, highlights, accents
- **Blox Black (#0E1909)**: Primary text, dark cards, headers
- **Dark Grey (#787663)**: Secondary text, borders, dividers
- **Mid Grey (#C9C4B7)**: Dividers, subtle borders
- **Light Grey (#F3F0ED)**: Backgrounds, light cards, text on dark

### 6. **Button Styles**
- **Primary**: Lime Yellow background, Blox Black text, 44px height
- **Secondary**: Light Grey background, Blox Black text
- **Tertiary**: Transparent, Dark Grey text
- **Destructive**: Light Grey background, Dark Grey border, Blox Black text

### 7. **Shadows & Depth**
- Card Shadow: `0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)`
- Card Hover: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)`
- Subtle elevation on hover: `translateY(-4px)`

### 8. **Border Radius**
- Cards: 16px
- Buttons: 10px-12px
- Inputs: 10px
- Small elements: 8px
- Pills: 50px (full rounded)

## 📋 Component Patterns

### Standard Content Card
```scss
.content-card {
  background: var(--card-background); // Light Grey
  border-radius: var(--radius-card); // 16px
  box-shadow: var(--card-shadow);
  border: none;
  padding: var(--spacing-lg); // 24px
  transition: all var(--transition-base);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--card-shadow-hover);
  }
}
```

### Section Card (Dark)
```scss
.section-card {
  background: var(--blox-black);
  color: var(--background-secondary);
  border-radius: var(--radius-card);
  box-shadow: var(--card-shadow);
  border: none;
  padding: var(--spacing-lg);
}
```

### Page Container
```scss
.page-container {
  padding: var(--spacing-lg);
  background-color: var(--background); // Light Grey
  min-height: 100vh;
}
```

### Typography Hierarchy
```scss
.page-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-text); // Blox Black
  letter-spacing: -0.02em;
  margin-bottom: var(--spacing-sm);
}

.page-subtitle {
  font-size: 15px;
  color: var(--secondary-text); // Dark Grey
  opacity: 0.8;
}
```

## ✅ Implementation Checklist

### Core Components
- [ ] Update shared Card component to match vehicle card pattern
- [ ] Standardize Paper component styling
- [ ] Update Button component (already done)
- [ ] Ensure consistent form inputs
- [ ] Standardize dividers and separators

### Pages to Update
- [ ] Dashboard - Apply clean card pattern
- [ ] Applications List - Match vehicle card style
- [ ] Application Detail - Clean, minimal layout
- [ ] Payment Calendar - Simplified design
- [ ] Payment History - Clean table cards
- [ ] Payment Page - Minimal form design
- [ ] Profile/Settings - Clean form cards
- [ ] Help/FAQ - Minimal content cards
- [ ] Landing Page - Match vehicle card aesthetic

### Global Styles
- [ ] Ensure consistent spacing across all pages
- [ ] Standardize shadows and borders
- [ ] Consistent typography hierarchy
- [ ] Remove unnecessary borders
- [ ] Simplify color usage

## 🎯 Design Goals

1. **Consistency**: Every card, button, and layout follows the same design language
2. **Clarity**: Clear visual hierarchy and information architecture
3. **Professionalism**: Clean, modern, premium feel
4. **Accessibility**: Proper contrast ratios and focus states
5. **Responsiveness**: Design scales beautifully across all devices

---

**Last Updated**: Based on vehicle card redesign
**Design Pattern Source**: Vehicle Browse Page Card Design

