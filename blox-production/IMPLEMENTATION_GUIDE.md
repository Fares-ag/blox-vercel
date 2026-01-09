# Clean Design Implementation Guide

This guide explains how to apply the clean, professional, minimalistic design (matching the vehicle cards) across the entire customer-facing application.

## ✅ What's Been Completed

1. **Global Card Styles** - Added to `global.scss`:
   - `.content-card` - Light Grey background cards (default)
   - `.section-card` - Dark cards for content sections
   - `.stat-card` - Statistics cards with clean design
   - Page container and header patterns

2. **Shared Card Component** - Updated to use clean design by default

3. **Dashboard Stat Cards** - Updated to use Light Grey background matching vehicle cards

4. **Vehicle Cards** - Clean design pattern (reference implementation)

## 🎯 Design Pattern Summary

### Light Cards (Default - Matching Vehicle Cards)
- **Background**: Light Grey (`#F3F0ED`)
- **Border**: None (clean, minimal)
- **Shadow**: Subtle (`var(--card-shadow)`)
- **Text**: Blox Black for headings, Dark Grey for secondary
- **Hover**: Slight lift (`translateY(-4px)`) with enhanced shadow

### Dark Cards (For Content Sections)
- **Background**: Blox Black (`#0E1909`)
- **Border**: None
- **Shadow**: Subtle
- **Text**: Light Grey for all text
- **Hover**: Same lift effect

## 📋 Pages to Update

### Priority 1: High-Traffic Pages
- [x] Dashboard - Stat cards updated
- [ ] Applications List - Apply clean card pattern
- [ ] Application Detail - Clean, minimal layout
- [ ] Payment Calendar - Simplified design
- [ ] Payment History - Clean table cards
- [ ] Payment Page - Minimal form design

### Priority 2: Secondary Pages
- [ ] Profile/Settings - Clean form cards
- [ ] Help/FAQ - Minimal content cards
- [ ] Document Upload - Clean upload cards
- [ ] Landing Page - Match vehicle card aesthetic

## 🔧 How to Apply Clean Design

### Step 1: Update Card Components

Replace existing Paper/Card components with clean pattern:

**Before:**
```tsx
<Paper sx={{ padding: 2, border: '1px solid #ddd' }}>
  Content
</Paper>
```

**After:**
```tsx
<Paper className="content-card">
  Content
</Paper>
```

### Step 2: Update Page Containers

Use the global page container pattern:

```scss
.page-container {
  padding: var(--spacing-lg);
  background-color: var(--background); /* Light Grey */
  min-height: 100vh;
}
```

### Step 3: Apply Typography Hierarchy

```tsx
<Typography variant="h4" className="page-title">
  Page Title
</Typography>
<Typography variant="body2" className="page-subtitle">
  Subtitle text
</Typography>
```

### Step 4: Remove Unnecessary Borders

- Remove `border: 1px solid` from cards
- Use shadows for depth instead
- Only use borders for form inputs and dividers

### Step 5: Standardize Spacing

Use CSS variables:
- `var(--spacing-xs)` = 4px
- `var(--spacing-sm)` = 8px
- `var(--spacing-md)` = 16px
- `var(--spacing-lg)` = 24px
- `var(--spacing-xl)` = 32px

## 🎨 Color Usage Guidelines

### Background Colors
- **Page Background**: Light Grey (`var(--background)`)
- **Card Background (Default)**: Light Grey (`var(--card-background)`)
- **Card Background (Dark)**: Blox Black (`var(--blox-black)`)
- **Card Hover**: Slightly darker Light Grey (`var(--card-hover)`)

### Text Colors
- **Primary Text**: Blox Black (`var(--primary-text)`)
- **Secondary Text**: Dark Grey (`var(--secondary-text)`)
- **Text on Dark Cards**: Light Grey (`var(--background-secondary)`)

### Accent Colors
- **Primary Accent**: Lime Yellow (`var(--primary-color)`)
- **Use for**: Icons, highlights, CTAs, active states

## 🔍 Quick Checklist for Each Page

When updating a page, ensure:

- [ ] Cards use `.content-card` or `.section-card` class
- [ ] No unnecessary borders (use shadows instead)
- [ ] Consistent spacing using CSS variables
- [ ] Typography follows hierarchy (page-title, page-subtitle)
- [ ] Buttons use clean design (already done)
- [ ] Hover effects are subtle (`translateY(-4px)`)
- [ ] Colors match brand palette
- [ ] Remove any hardcoded colors

## 📝 Example: Applications List Page

**Current:**
```tsx
<Card className="application-card" sx={{ border: '1px solid #ddd' }}>
  <CardContent sx={{ padding: 2 }}>
    Content
  </CardContent>
</Card>
```

**Updated:**
```tsx
<Card className="application-card content-card">
  <CardContent sx={{ padding: 'var(--spacing-lg)' }}>
    Content
  </CardContent>
</Card>
```

**SCSS:**
```scss
.application-card {
  // Inherits from .content-card in global.scss
  // Add page-specific overrides only if needed
  cursor: pointer;
  
  &:hover {
    // Global hover already applied, add specific effects here if needed
  }
}
```

## 🚀 Next Steps

1. **Review and Update Each Page** - Go through Priority 1 pages first
2. **Test Consistency** - Ensure all pages feel cohesive
3. **Remove Legacy Styles** - Clean up old CSS that doesn't match the pattern
4. **Document Exceptions** - If any page needs different styling, document why

## 💡 Design Principles to Remember

1. **Minimalism First** - Less is more
2. **Consistency** - Same patterns everywhere
3. **Subtle Interactions** - Gentle hover effects, not jarring
4. **White Space** - Generous padding and margins
5. **Typography Hierarchy** - Clear visual hierarchy
6. **Color Consistency** - Use brand palette only

---

**Last Updated**: Based on vehicle card clean design implementation
**Reference**: VehicleCard component (`packages/customer/src/modules/customer/features/vehicles/components/VehicleCard/`)

