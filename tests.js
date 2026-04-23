'use strict';

const fc = require('fast-check');
const assert = require('assert');

// ─────────────────────────────────────────────────────────────────────────────
// Pure functions extracted/reimplemented from index.html for testing
// ─────────────────────────────────────────────────────────────────────────────

// --- Property 10 helper ---
// Returns true if the sidebar should be hidden for the given pageId.
function getSidebarHidden(pageId) {
  return pageId === 'start' || pageId === 'easter-egg';
}

// --- Property 11 helper ---
// Returns the active category id for the sidebar given the current page and context.
function getActiveCategoryId(pageId, context) {
  if (pageId === 'options') return context.categoryId != null ? context.categoryId : null;
  if (pageId === 'item-detail') return context.fromCategoryId != null ? context.fromCategoryId : null;
  return null;
}

// --- Property 1 helper ---
// Renders an HTML string with one .category-card per category.
function renderCategoryCards(categories) {
  return categories.map(cat =>
    `<div class="category-card" data-id="${cat.id}">${cat.name}</div>`
  ).join('');
}

// --- Properties 2 & 3 helper ---
// Filters items by query (case-insensitive match on name or ingredients).
function filterItems(items, query) {
  if (query === '') return items;
  const q = query.toLowerCase();
  return items.filter(i =>
    i.name.toLowerCase().includes(q) ||
    i.ingredients.toLowerCase().includes(q)
  );
}

// --- Property 4 helper ---
// Builds an 8×4 vending grid from an items array.
function buildVendingGrid(items) {
  const grid = Array.from({ length: 8 }, () => Array(4).fill(null));
  items
    .filter(i => i.row != null && i.col != null)
    .forEach(i => { grid[i.row - 1][i.col - 1] = i; });
  return grid;
}

// --- Property 5 helper ---
// Returns the HTML string for an occupied vending slot.
function renderSlotHTML(item) {
  const price = '$' + item.price.toFixed(2);
  return `<div class="vending-slot occupied" data-item-id="${item.id}"
    onclick="showPage('item-detail', { itemId: '${item.id}', fromCategoryId: 'all' })">
    <div class="slot-image" style="background:${item.color};"></div>
    <div class="slot-info">
      <div class="slot-name">${item.name}</div>
      <div class="slot-price">${price}</div>
    </div>
  </div>`;
}

// --- Properties 6 & 7 helpers ---
// Returns the HTML string for an item card.
function renderCardHTML(item, categoryId) {
  const price = '$' + item.price.toFixed(2);
  const isHighProtein = categoryId === 'high-protein';
  const proteinBadge = isHighProtein
    ? `<span class="card-protein">${item.protein}g protein</span>`
    : '';
  return `<div class="item-card" data-item-id="${item.id}"
    onclick="showPage('item-detail', { itemId: '${item.id}', fromCategoryId: '${categoryId}' })">
    <div class="card-image" style="background:${item.color};"></div>
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-meta">
        <span class="card-price">${price}</span>
        <span class="card-calories">${item.calories} cal</span>
      </div>
      ${proteinBadge}
    </div>
    <div class="card-footer">
      <button class="add-btn">+</button>
    </div>
  </div>`;
}

// --- Properties 8 & 9 helpers ---
// Returns the HTML string for the item detail page.
function renderItemDetailHTML(item, fromCategoryId) {
  const price = '$' + item.price.toFixed(2);
  return `<div class="item-detail-wrapper">
    <button class="item-detail-back-btn"
      onclick="showPage('options', { categoryId: '${fromCategoryId}' })">← Back</button>
    <div class="item-detail-image" style="background:${item.color};"></div>
    <div class="item-detail-body">
      <div class="item-detail-name">${item.name}</div>
      <div class="item-detail-price">${price}</div>
      <div class="item-detail-calories">${item.calories} cal</div>
      <div class="item-detail-ingredients"><strong>Ingredients:</strong> ${item.ingredients}</div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arbitraries
// ─────────────────────────────────────────────────────────────────────────────

const itemArb = fc.record({
  id: fc.string(),
  name: fc.string({ minLength: 1 }),
  price: fc.integer({ min: 100, max: 9999 }).map(n => n / 100),
  calories: fc.integer({ min: 100, max: 900 }),
  protein: fc.integer({ min: 5, max: 60 }),
  ingredients: fc.string({ minLength: 1 }),
  color: fc.constant('#A5D6A7'),
});

const itemWithSlotArb = fc.record({
  id: fc.string(),
  name: fc.string({ minLength: 1 }),
  price: fc.integer({ min: 100, max: 9999 }).map(n => n / 100),
  calories: fc.integer({ min: 100, max: 900 }),
  protein: fc.integer({ min: 5, max: 60 }),
  color: fc.constant('#A5D6A7'),
  row: fc.integer({ min: 1, max: 8 }),
  col: fc.integer({ min: 1, max: 4 }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

async function testProperty10() {
  // Feature: farmer-fridge-ui, Property 10: Sidebar visible on correct pages
  fc.assert(
    fc.property(
      fc.constantFrom('start', 'easter-egg', 'categories', 'options', 'item-detail'),
      (pageId) => {
        const hidden = getSidebarHidden(pageId);
        if (pageId === 'start' || pageId === 'easter-egg') {
          assert.strictEqual(hidden, true, `Expected sidebar hidden for page: ${pageId}`);
        } else {
          assert.strictEqual(hidden, false, `Expected sidebar visible for page: ${pageId}`);
        }
      }
    ),
    { numRuns: 100 }
  );
  console.log('PASS: Property 10 - Sidebar visible on correct pages');
}

async function testProperty11() {
  // Feature: farmer-fridge-ui, Property 11: Sidebar active state tracks current category
  const categoryArb = fc.constantFrom('all', 'high-protein', 'salads');

  // On 'options' page: active category = context.categoryId
  fc.assert(
    fc.property(categoryArb, (categoryId) => {
      const active = getActiveCategoryId('options', { categoryId });
      assert.strictEqual(active, categoryId);
    }),
    { numRuns: 100 }
  );

  // On 'item-detail' page: active category = context.fromCategoryId
  fc.assert(
    fc.property(categoryArb, (fromCategoryId) => {
      const active = getActiveCategoryId('item-detail', { fromCategoryId });
      assert.strictEqual(active, fromCategoryId);
    }),
    { numRuns: 100 }
  );

  // On other pages: active category = null (no active button)
  fc.assert(
    fc.property(
      fc.constantFrom('start', 'easter-egg', 'categories'),
      categoryArb,
      (pageId, categoryId) => {
        const active = getActiveCategoryId(pageId, { categoryId });
        assert.strictEqual(active, null);
      }
    ),
    { numRuns: 100 }
  );

  console.log('PASS: Property 11 - Sidebar active state tracks current category');
}

async function testProperty1() {
  // Feature: farmer-fridge-ui, Property 1: Category render count matches data
  // Validates: Requirements 3.3, 8.2
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.string(),
          name: fc.string(),
          icon: fc.constant('🥗'),
          available: fc.boolean(),
          gridType: fc.constantFrom('card', 'vending'),
        }),
        { minLength: 0, maxLength: 20 }
      ),
      (categories) => {
        const html = renderCategoryCards(categories);
        const count = (html.match(/class="category-card"/g) || []).length;
        assert.strictEqual(count, categories.length);
      }
    ),
    { numRuns: 100 }
  );
  console.log('PASS: Property 1 - Category render count matches data');
}

async function testProperty2() {
  // Feature: farmer-fridge-ui, Property 2: Search filter correctness
  // Validates: Requirements 4.1
  const searchItemArb = fc.record({
    name: fc.string(),
    ingredients: fc.string(),
  });

  fc.assert(
    fc.property(
      fc.array(searchItemArb),
      fc.string({ minLength: 1 }),
      (items, query) => {
        const results = filterItems(items, query);
        const q = query.toLowerCase();
        // Every returned item must match
        for (const item of results) {
          const matches =
            item.name.toLowerCase().includes(q) ||
            item.ingredients.toLowerCase().includes(q);
          assert.ok(matches, `Item "${item.name}" does not match query "${query}"`);
        }
        // No non-matching item should appear
        const nonMatching = items.filter(
          i => !i.name.toLowerCase().includes(q) && !i.ingredients.toLowerCase().includes(q)
        );
        for (const item of nonMatching) {
          assert.ok(!results.includes(item), `Non-matching item "${item.name}" appeared in results`);
        }
      }
    ),
    { numRuns: 100 }
  );
  console.log('PASS: Property 2 - Search filter correctness');
}

async function testProperty3() {
  // Feature: farmer-fridge-ui, Property 3: Search clear restores full view
  // Validates: Requirements 4.2
  const searchItemArb = fc.record({
    name: fc.string(),
    ingredients: fc.string(),
  });

  fc.assert(
    fc.property(
      fc.array(searchItemArb),
      (items) => {
        const results = filterItems(items, '');
        assert.strictEqual(results.length, items.length);
      }
    ),
    { numRuns: 100 }
  );
  console.log('PASS: Property 3 - Search clear restores full view');
}

async function testProperty4() {
  // Feature: farmer-fridge-ui, Property 4: Vending grid is always 8×4
  // Validates: Requirements 5.2
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          row: fc.integer({ min: 1, max: 8 }),
          col: fc.integer({ min: 1, max: 4 }),
        })
      ),
      (items) => {
        const grid = buildVendingGrid(items);
        assert.strictEqual(grid.length, 8, 'Grid must have 8 rows');
        for (const row of grid) {
          assert.strictEqual(row.length, 4, 'Each row must have 4 columns');
        }
      }
    ),
    { numRuns: 100 }
  );
  console.log('PASS: Property 4 - Vending grid is always 8×4');
}

async function testProperty5() {
  // Feature: farmer-fridge-ui, Property 5: Occupied vending slot renders item data
  // Validates: Requirements 5.3
  fc.assert(
    fc.property(
      itemWithSlotArb,
      (item) => {
        const html = renderSlotHTML(item);
        assert.ok(html.includes(item.name), `Slot HTML missing item name: ${item.name}`);
        assert.ok(
          html.includes('$' + item.price.toFixed(2)),
          `Slot HTML missing price: $${item.price.toFixed(2)}`
        );
      }
    ),
    { numRuns: 100 }
  );
  console.log('PASS: Property 5 - Occupied vending slot renders item data');
}

async function testProperty6() {
  // Feature: farmer-fridge-ui, Property 6: Item card renders all required fields
  // Validates: Requirements 6.3, 6.4, 6.5
  fc.assert(
    fc.property(
      itemArb,
      fc.constantFrom('high-protein', 'salads'),
      (item, categoryId) => {
        const html = renderCardHTML(item, categoryId);
        assert.ok(html.includes(item.name), 'Card missing item name');
        assert.ok(html.includes('$' + item.price.toFixed(2)), 'Card missing price');
        assert.ok(html.includes(String(item.calories)), 'Card missing calories');
        assert.ok(html.includes('+'), 'Card missing + button');
        if (categoryId === 'high-protein') {
          assert.ok(
            html.includes(String(item.protein)),
            'High-protein card missing protein count'
          );
        }
      }
    ),
    { numRuns: 100 }
  );
  console.log('PASS: Property 6 - Item card renders all required fields');
}

async function testProperty7() {
  // Feature: farmer-fridge-ui, Property 7: Clicking any item navigates to its detail page
  // Validates: Requirements 5.6, 6.7
  fc.assert(
    fc.property(
      itemArb,
      fc.constantFrom('all', 'high-protein', 'salads'),
      (item, categoryId) => {
        const html = renderCardHTML(item, categoryId);
        assert.ok(
          html.includes(item.id),
          `Card onclick missing item id: ${item.id}`
        );
        assert.ok(
          html.includes(categoryId),
          `Card onclick missing categoryId: ${categoryId}`
        );
      }
    ),
    { numRuns: 100 }
  );
  console.log('PASS: Property 7 - Clicking any item navigates to its detail page');
}

async function testProperty8() {
  // Feature: farmer-fridge-ui, Property 8: Item detail page renders all item fields
  // Validates: Requirements 7.2, 7.3, 7.4
  fc.assert(
    fc.property(
      itemArb,
      fc.constantFrom('all', 'high-protein', 'salads'),
      (item, fromCategoryId) => {
        const html = renderItemDetailHTML(item, fromCategoryId);
        assert.ok(html.includes(item.name), 'Detail missing item name');
        assert.ok(html.includes('$' + item.price.toFixed(2)), 'Detail missing price');
        assert.ok(html.includes(String(item.calories)), 'Detail missing calories');
        assert.ok(html.includes(item.ingredients), 'Detail missing ingredients');
      }
    ),
    { numRuns: 100 }
  );
  console.log('PASS: Property 8 - Item detail page renders all item fields');
}

async function testProperty9() {
  // Feature: farmer-fridge-ui, Property 9: Back button returns to originating category
  // Validates: Requirements 7.5
  fc.assert(
    fc.property(
      itemArb,
      fc.constantFrom('all', 'high-protein', 'salads'),
      (item, fromCategoryId) => {
        const html = renderItemDetailHTML(item, fromCategoryId);
        assert.ok(
          html.includes(fromCategoryId),
          `Back button missing fromCategoryId: ${fromCategoryId}`
        );
      }
    ),
    { numRuns: 100 }
  );
  console.log('PASS: Property 9 - Back button returns to originating category');
}

// ─────────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  try {
    await testProperty1();
    await testProperty2();
    await testProperty3();
    await testProperty4();
    await testProperty5();
    await testProperty6();
    await testProperty7();
    await testProperty8();
    await testProperty9();
    await testProperty10();
    await testProperty11();
    console.log('\nAll 11 property tests passed.');
  } catch (err) {
    console.error('\nTest failed:', err.message || err);
    process.exit(1);
  }
})();
