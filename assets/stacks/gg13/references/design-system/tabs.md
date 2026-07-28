# Tabs

## Overview

PrimeVue 4 replaced the monolithic `TabView`/`TabPanel` with a **composed Tabs API**: `Tabs`, `TabList`, `Tab`, `TabPanels`, and `TabPanel`. Use for organizing content into mutually exclusive tabbed sections.

```javascript
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
```

- `Tabs` — root wrapper. Holds the active `value` (`v-model:value` or a plain `value`).
- `TabList` — contains the clickable `Tab` headers.
- `Tab` — a single header; each needs a `value` matching a `TabPanel`.
- `TabPanels` — wraps the content panels.
- `TabPanel` — a single content panel; each needs a `value` matching its `Tab`.

## Basic Tabs

```html
<Tabs v-model:value="activeTab">
  <TabList>
    <Tab value="overview">Overview</Tab>
    <Tab value="settings">Settings</Tab>
    <Tab value="activity">Activity</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="overview">
      <OverviewContent />
    </TabPanel>
    <TabPanel value="settings">
      <SettingsForm />
    </TabPanel>
    <TabPanel value="activity">
      <ActivityFeed />
    </TabPanel>
  </TabPanels>
</Tabs>
```

## Tab Types

### Text Tabs

```html
<Tabs value="dashboard">
  <TabList>
    <Tab value="dashboard">Dashboard</Tab>
    <Tab value="analytics">Analytics</Tab>
    <Tab value="reports">Reports</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="dashboard"><DashboardContent /></TabPanel>
    <TabPanel value="analytics"><AnalyticsContent /></TabPanel>
    <TabPanel value="reports"><ReportsContent /></TabPanel>
  </TabPanels>
</Tabs>
```

- Default tab styling.
- Used for **navigation between content sections**.

### Icon + Text Tabs

```html
<Tabs value="dashboard">
  <TabList>
    <Tab value="dashboard">
      <div class="flex items-center gap-2">
        <i class="pi pi-home" />
        <span>Dashboard</span>
      </div>
    </Tab>
    <Tab value="settings">
      <div class="flex items-center gap-2">
        <i class="pi pi-cog" />
        <span>Settings</span>
      </div>
    </Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="dashboard"><DashboardContent /></TabPanel>
    <TabPanel value="settings"><SettingsForm /></TabPanel>
  </TabPanels>
</Tabs>
```

- Icon on the left, text on the right.
- Place custom markup directly inside `<Tab>` (no `#header` slot needed in v4).
- Icon size: `text-base` (16px).
- Gap between icon and text: `gap-2` (8px).

### Tab with Badge

```html
<Tabs value="messages">
  <TabList>
    <Tab value="messages">
      <div class="flex items-center gap-2">
        <i class="pi pi-envelope" />
        <span>Messages</span>
        <Badge value="5" severity="info" size="small" class="ml-1" />
      </div>
    </Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="messages"><MessageList /></TabPanel>
  </TabPanels>
</Tabs>
```

- Badge positioned to the right of tab text.
- Use `ml-1` (4px) for spacing.
- Badge size: `small`. (Note: `Badge` has no `primary` severity — use `info`/`success`/`warn`/`danger`/`secondary`/`contrast`.)

### Closeable Tabs

The composed API has no built-in `closable` prop. Render a close button inside the `Tab` and manage the tab list yourself.

```html
<Tabs v-model:value="activeTab">
  <TabList>
    <Tab v-for="tab in tabs" :key="tab.value" :value="tab.value">
      <div class="flex items-center gap-2">
        <span>{{ tab.header }}</span>
        <i
          v-if="tabs.length > 1"
          class="pi pi-times text-xs cursor-pointer"
          @click.stop="closeTab(tab.value)"
        />
      </div>
    </Tab>
  </TabList>
  <TabPanels>
    <TabPanel v-for="tab in tabs" :key="tab.value" :value="tab.value">
      <component :is="tab.content" />
    </TabPanel>
  </TabPanels>
</Tabs>
```

- Close button (X) on each tab.
- Use for **dynamic tabs** (user-created, removable).
- **Never close the last tab** (keep at least one tab open).

## Tab Sizing

### Standard Tabs

```html
<Tabs value="tab1">
  <TabList>
    <Tab value="tab1">Tab 1</Tab>
    <Tab value="tab2">Tab 2</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="tab1"><!-- content --></TabPanel>
    <TabPanel value="tab2"><!-- content --></TabPanel>
  </TabPanels>
</Tabs>
```

- Default tab size.
- Used for **most use cases**.

### Compact Tabs

```html
<Tabs value="tab1">
  <TabList>
    <Tab value="tab1" class="text-sm">Tab 1</Tab>
    <Tab value="tab2" class="text-sm">Tab 2</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="tab1"><!-- content --></TabPanel>
    <TabPanel value="tab2"><!-- content --></TabPanel>
  </TabPanels>
</Tabs>
```

- Smaller font size (`text-sm`).
- Used for **dense UI**, **mobile navigation**.

### Large Tabs

```html
<Tabs value="tab1">
  <TabList>
    <Tab value="tab1" class="text-lg">Tab 1</Tab>
    <Tab value="tab2" class="text-lg">Tab 2</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="tab1"><!-- content --></TabPanel>
    <TabPanel value="tab2"><!-- content --></TabPanel>
  </TabPanels>
</Tabs>
```

- Larger font size (`text-lg`).
- Used for **hero tabs**, **landing pages**.

## Lazy Loading

```html
<Tabs v-model:value="activeTab" :lazy="true">
  <TabList>
    <Tab value="dashboard">Dashboard</Tab>
    <Tab value="analytics">Analytics</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="dashboard"><DashboardContent /></TabPanel>
    <TabPanel value="analytics"><AnalyticsContent /></TabPanel>
  </TabPanels>
</Tabs>
```

- `:lazy="true"` on `Tabs` means hidden tabs are **not rendered at all** (rather than hidden with CSS).
- **Use for heavy content** (charts, tables, forms).
- **Show loading state** while content loads.

## Responsive Tab Behavior

### Collapsible Tabs (Mobile)

```html
<!-- Mobile: dropdown selector -->
<div class="md:hidden">
  <Select
    v-model="activeTab"
    :options="tabs"
    optionLabel="header"
    optionValue="value"
    class="w-full"
  />
</div>

<!-- Desktop: horizontal tabs -->
<div class="hidden md:block">
  <Tabs v-model:value="activeTab">
    <TabList>
      <Tab v-for="tab in tabs" :key="tab.value" :value="tab.value">
        {{ tab.header }}
      </Tab>
    </TabList>
    <TabPanels>
      <TabPanel v-for="tab in tabs" :key="tab.value" :value="tab.value">
        <component :is="tab.content" />
      </TabPanel>
    </TabPanels>
  </Tabs>
</div>
```

- On mobile: `Select` dropdown selector.
- On desktop: horizontal tabs.
- Use `md:hidden` and `hidden md:block` for responsive visibility.

### Scrollable Tabs

```html
<Tabs value="tab1" scrollable>
  <TabList>
    <Tab value="tab1">Tab 1</Tab>
    <Tab value="tab2">Tab 2</Tab>
    <Tab value="tab3">Tab 3</Tab>
    <Tab value="tab4">Tab 4</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="tab1"><!-- content --></TabPanel>
    <TabPanel value="tab2"><!-- content --></TabPanel>
    <TabPanel value="tab3"><!-- content --></TabPanel>
    <TabPanel value="tab4"><!-- content --></TabPanel>
  </TabPanels>
</Tabs>
```

- Set the `scrollable` prop on `Tabs` for horizontal scroll with navigation buttons.
- **Limit to 6–8 tabs** before using scroll or a dropdown.

## Tab Spacing

### Between Tabs

| Context | Value |
|---------|-------|
| Tab to tab | `gap-4` (16px) or `border-r` divider |
| Tab to content | `mt-4` (16px) |
| Tab header to tab body | `border-b` divider |

### Within Tab Content

| Context | Value |
|---------|-------|
| Content padding | `p-6` (24px) |
| Between sections | `mb-6` (24px) |
| Between form fields | `mb-4` (16px) |

## Tab Rules

1. **Use tabs for mutually exclusive content.** One tab active at a time.
2. **Limit to 5–7 tabs.** More → use a sidebar or dropdown.
3. **Always show an active tab indicator** (underline, background, bold text).
4. **Use icon + text tabs** for better recognition.
5. **Lazy load heavy tab content** to improve initial load time.
6. **Never close the last tab** in closeable tab interfaces.
7. **Use a `Select` dropdown on mobile** for many tabs.
8. **Persist active tab** in URL query params for bookmarking.
9. **Tab content must scroll independently** of the page.
10. **Test all tab states:** active, inactive, hover, focus.

## PrimeVue Tabs Theme Tokens

```css
--p-tabs-transition-duration: 300ms;

/* Tab list */
--p-tabs-tablist-border-width: 0 0 2px 0;
--p-tabs-tablist-background: transparent;
--p-tabs-tablist-border-color: var(--color-neutral-200);

/* Tab */
--p-tabs-tab-background: transparent;
--p-tabs-tab-hover-background: var(--color-neutral-50);
--p-tabs-tab-active-background: transparent;
--p-tabs-tab-border-width: 0 0 2px 0;
--p-tabs-tab-border-color: transparent;
--p-tabs-tab-hover-border-color: var(--color-neutral-300);
--p-tabs-tab-active-border-color: var(--color-primary-600);
--p-tabs-tab-color: var(--color-neutral-600);
--p-tabs-tab-hover-color: var(--color-neutral-800);
--p-tabs-tab-active-color: var(--color-primary-600);
--p-tabs-tab-padding: 0.75rem 1rem;
--p-tabs-tab-font-weight: 600;
--p-tabs-tab-gap: 0.5rem;
--p-tabs-tab-focus-ring-color: var(--color-primary-300);

/* Tab panel */
--p-tabs-tabpanel-background: transparent;
--p-tabs-tabpanel-color: var(--color-neutral-800);
--p-tabs-tabpanel-padding: 1.5rem;

/* Active bar (underline indicator) */
--p-tabs-active-bar-height: 2px;
--p-tabs-active-bar-bottom: 0;
--p-tabs-active-bar-background: var(--color-primary-600);
```
