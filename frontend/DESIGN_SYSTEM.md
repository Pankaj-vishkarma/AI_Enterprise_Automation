# Design System Documentation

## Color Palette

### Primary Colors
- **Primary Blue**: `#0066ff` - Main brand color for buttons, links, active states
- **Accent Cyan**: `#00d4ff` - Highlight color for emphasis and secondary CTAs

### Neutral Colors
- **White**: `#ffffff` - Background
- **Off-white**: `#fafafa` - Sidebar and card backgrounds
- **Light Gray**: `#f5f5f5` - Input backgrounds
- **Border Gray**: `#e0e0e0` - Borders and dividers
- **Muted**: `#e5e5e5` - Disabled states
- **Dark Gray**: `#666666` - Secondary text
- **Black**: `#0f0f0f` - Primary text and foreground

### Semantic Colors
- **Destructive Red**: `#ff4444` - Error states, delete actions
- **Success Green**: `#22c55e` - Success messages, active status
- **Warning Yellow**: `#eab308` - Warning alerts, attention needed
- **Info Blue**: `#3b82f6` - Information messages

## Typography

### Font Families
- **Headings**: Plus Jakarta Sans (500, 600, 700 weights)
- **Body**: Inter (400, 500, 600 weights)
- **Monospace**: Courier New (for code/technical text)

### Font Sizes & Line Heights
- **Display**: 28-32px, line-height 1.2
- **Heading 1**: 24px, line-height 1.3
- **Heading 2**: 20px, line-height 1.3
- **Heading 3**: 18px, line-height 1.4
- **Body**: 14-16px, line-height 1.5
- **Small**: 12px, line-height 1.4
- **Tiny**: 11px, line-height 1.3

## Spacing Scale

Follows Tailwind's 4px base unit:
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- 2xl: 32px
- 3xl: 48px
- 4xl: 64px

## Border Radius

- **sm**: 4.8px (for small elements)
- **md**: 8px (default)
- **lg**: 11.2px
- **xl**: 14.4px (for large modals)
- **full**: 9999px (for pills/badges)

## Shadow System

### Subtle Shadow
```css
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
```

### Medium Shadow
```css
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
```

### Large Shadow
```css
box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
```

## Component Patterns

### Buttons
- **Primary Button**: Blue background, white text, hover:bg-blue-600
- **Secondary Button**: Gray background, dark text, border
- **Destructive Button**: Red background, white text
- **Ghost Button**: Transparent, hover background

### Forms
- **Input**: Gray border, light background, focus ring-blue
- **Label**: Font-weight 500, 14px, dark text
- **Error State**: Red text, red border, light red background

### Cards
- **Base**: White background, subtle border, rounded-lg
- **Hover State**: Slight shadow increase, border color intensify
- **Active State**: Blue left border or background tint

### Tables
- **Header Row**: Light gray background, font-weight 600
- **Body Rows**: White background, hover:light gray
- **Borders**: Subtle gray dividers
- **Padding**: 16px horizontal, 12px vertical

## Responsive Breakpoints

- **Mobile**: < 640px (xs to sm)
- **Tablet**: 640px - 1024px (md to lg)
- **Desktop**: > 1024px (xl+)

## Accessibility

- **Contrast Ratio**: All text meets WCAG AA standards (4.5:1 for body text)
- **Focus States**: Visible 2px blue ring on all interactive elements
- **Font Size**: Minimum 14px for body text
- **Line Height**: Minimum 1.4 for readability

## CSS Variables (Design Tokens)

Defined in `globals.css`:

```css
:root {
  --background: #ffffff;
  --foreground: #0f0f0f;
  --card: #fafafa;
  --card-foreground: #0f0f0f;
  --primary: #0066ff;
  --primary-foreground: #ffffff;
  --secondary: #f0f0f0;
  --secondary-foreground: #0f0f0f;
  --muted: #e5e5e5;
  --muted-foreground: #666666;
  --accent: #00d4ff;
  --accent-foreground: #0f0f0f;
  --destructive: #ff4444;
  --border: #e0e0e0;
  --input: #f5f5f5;
  --ring: #0066ff;
}
```

## Component Usage Examples

### Button Component
```jsx
import { Button } from '@/components/common';

<Button variant="primary" size="md">Click me</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost">More options</Button>
```

### Input Component
```jsx
<Input label="Email" type="email" placeholder="you@example.com" />
<Input label="Password" type="password" error="Password too short" />
```

### Card Component
```jsx
<Card>
  <h3 className="text-lg font-semibold">Card Title</h3>
  <p className="text-muted-foreground">Card content</p>
</Card>
```

### Badge Component
```jsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
```

## Animation & Transitions

- **Default**: 150-200ms ease-in-out
- **Hover States**: Immediate visual feedback
- **Page Transitions**: 200-300ms fade
- **Loading States**: Smooth spinner animation

## Dark Mode

Currently not implemented (light mode only). To add dark mode in future:
1. Add `.dark` class styles to globals.css
2. Create theme switcher component
3. Persist theme preference in localStorage
4. Add system preference detection

## Theming System

The design system is fully themeable through CSS variables. To change colors:
1. Update `:root` CSS variables in `globals.css`
2. All components automatically use new colors
3. No component-level color hard-coding

## Best Practices

1. **Use Design Tokens**: Always use CSS variables, never hard-code colors
2. **Component Composition**: Build complex UIs from simple reusable components
3. **Responsive First**: Mobile designs first, enhance for larger screens
4. **Accessibility**: Always test with keyboard navigation and screen readers
5. **Performance**: Minimize CSS output, lazy load non-critical styles

## References

- Design Inspiration: Linear, Notion, Stripe
- Icon Library: Lucide React
- CSS Framework: Tailwind CSS v4
- Font Provider: Google Fonts (Plus Jakarta Sans, Inter)
