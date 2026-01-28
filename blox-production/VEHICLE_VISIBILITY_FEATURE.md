# Vehicle Visibility Control Feature

## Overview
Admins can now control which vehicles are visible to customers on the "Browse Vehicles" page by setting the vehicle's **Status** field.

## How It Works

### For Admins:

#### Individual Vehicle Control:
1. Navigate to **Admin → Vehicles** in the admin panel
2. Click on any vehicle to view its details, or click the Edit icon
3. In the edit page, you'll see a **Status** dropdown with two options:
   - **Active**: Vehicle will be visible to customers
   - **Inactive**: Vehicle will be hidden from customers

#### Bulk Actions (NEW):
1. Navigate to **Admin → Vehicles** in the admin panel
2. Use the checkboxes to select multiple vehicles:
   - Click the checkbox in the header to select/deselect all visible vehicles
   - Click individual checkboxes to select specific vehicles
3. Once vehicles are selected, a **"Bulk Actions"** button appears
4. Click **Bulk Actions** and choose:
   - **Activate Selected**: Make all selected vehicles visible to customers
   - **Deactivate Selected**: Hide all selected vehicles from customers
5. A success message will show how many vehicles were updated

### What Changed:

#### Customer-Facing Pages (Now Filter by Status):
- **Browse Vehicles Page**: Only shows vehicles with `status = 'active'`
- **Vehicle Filters**: Make and model dropdowns only show options from active vehicles
- **Help Chat**: Only shows active vehicles when customers inquire
- **Vehicle Search**: Only searches through active vehicles

#### Admin Panel (No Changes):
- Admins can see ALL vehicles (both active and inactive)
- Admins can filter by status in the products list page
- Admins have full control to edit any vehicle's status

## Files Modified

### Customer App:
1. `packages/customer/src/modules/customer/features/vehicles/pages/VehicleBrowsePage/VehicleBrowsePage.tsx`
   - Added filter: `response.data.filter((v) => v.status === 'active')`

2. `packages/customer/src/modules/customer/services/vehicle.service.ts`
   - `getVehicles()`: Filters to active vehicles only
   - `getMakes()`: Only shows makes from active vehicles
   - `getModelsByMake()`: Only shows models from active vehicles

3. `packages/customer/src/modules/customer/features/help/components/ChatModal/ChatModal.tsx`
   - `loadAvailableVehicles()`: Filters to active vehicles only

### Admin App (Added Bulk Actions):
1. `packages/admin/src/modules/admin/features/products/pages/ProductsListPage/ProductsListPage.tsx`
   - Added checkbox column for multi-select
   - Added "Select All" checkbox in table header
   - Added "Bulk Actions" menu button with Activate/Deactivate options
   - Added state management for selected products
   - Added bulk action handlers

2. `packages/shared/src/services/supabase-api.service.ts`
   - Added `bulkUpdateProductStatus()` method for efficient bulk updates
   - Method updates multiple products in a single database query
   - Clears cache after bulk update

### Database Schema:
- No database changes needed
- The `products` table already has a `status` field with values: `'active'` | `'inactive'`
- Bulk updates use Supabase's `.in()` method for efficient multi-row updates

## Usage Examples

### Example 1: Temporarily Hide a Vehicle
If a vehicle is sold or needs maintenance:
1. Go to **Admin → Vehicles**
2. Click on the vehicle
3. Click **Edit**
4. Change **Status** to **Inactive**
5. Click **Save**
6. The vehicle will immediately disappear from customer browse page

### Example 2: Show a New Vehicle
When a new vehicle arrives:
1. Go to **Admin → Vehicles**
2. Click **Add Vehicle**
3. Fill in all vehicle details
4. Set **Status** to **Active**
5. Click **Save**
6. The vehicle will immediately appear on customer browse page

### Example 3: Bulk Deactivate Multiple Vehicles
If you need to hide multiple vehicles at once (e.g., end of season inventory):
1. Go to **Admin → Vehicles**
2. Check the boxes next to all vehicles you want to hide (or use "Select All")
3. Click **Bulk Actions**
4. Select **Deactivate Selected**
5. Confirm the action
6. All selected vehicles will immediately disappear from customer browse page

### Example 4: Bulk Activate After Maintenance
When multiple vehicles return from maintenance:
1. Go to **Admin → Vehicles**
2. Filter by **Status: Inactive** to see hidden vehicles
3. Check the boxes next to vehicles that are ready
4. Click **Bulk Actions**
5. Select **Activate Selected**
6. All selected vehicles will immediately appear on customer browse page

## Benefits
- ✅ No database migration needed (uses existing `status` field)
- ✅ Simple and intuitive for admins
- ✅ **Bulk actions for efficient management of multiple vehicles**
- ✅ Immediate effect (no caching issues)
- ✅ Consistent across all customer-facing pages
- ✅ Admin panel still shows all vehicles for management
- ✅ Single database query for bulk updates (efficient and fast)

## Testing Checklist

### Individual Actions:
- [ ] Set a vehicle to "Inactive" in admin, verify it disappears from customer browse page
- [ ] Set a vehicle to "Active" in admin, verify it appears on customer browse page
- [ ] Verify inactive vehicles don't appear in make/model filter dropdowns
- [ ] Verify inactive vehicles don't appear in help chat vehicle suggestions
- [ ] Verify admin can still see and manage inactive vehicles in admin panel

### Bulk Actions:
- [ ] Select multiple vehicles using checkboxes
- [ ] Use "Select All" to select all visible vehicles on current page
- [ ] Click "Bulk Actions" → "Deactivate Selected" and verify:
  - Success message shows correct count
  - All selected vehicles disappear from customer browse page
  - Vehicles remain visible in admin panel with "Inactive" status
- [ ] Filter to show inactive vehicles, select some, click "Bulk Actions" → "Activate Selected" and verify:
  - Success message shows correct count
  - All selected vehicles appear on customer browse page
  - Vehicles show "Active" status in admin panel
- [ ] Verify bulk action with 0 vehicles selected shows warning message
- [ ] Verify bulk action works with 1 vehicle (edge case)
- [ ] Verify bulk action works with many vehicles (10+)
