/**
 * Migration Script: localStorage to Supabase
 * 
 * This script helps migrate existing localStorage data to Supabase
 * Run this in your browser console while on your app
 * 
 * Instructions:
 * 1. Open your app in the browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 6. Check the console for migration progress
 */

(async function migrateLocalStorageToSupabase() {
  console.log('🚀 Starting localStorage to Supabase migration...\n');

  // Import Supabase service (you'll need to adjust this based on your setup)
  // For now, we'll use the Supabase client directly
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in environment variables');
    console.log('Please make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
    return;
  }

  // Create Supabase client
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Helper function to convert camelCase to snake_case
  function toSnakeCase(obj) {
    if (Array.isArray(obj)) {
      return obj.map(toSnakeCase);
    }
    if (obj !== null && typeof obj === 'object') {
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        converted[snakeKey] = toSnakeCase(value);
      }
      return converted;
    }
    return obj;
  }

  // Migrate Products
  async function migrateProducts() {
    console.log('📦 Migrating Products...');
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    
    if (products.length === 0) {
      console.log('   No products to migrate');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Check if product already exists
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('id', product.id)
          .single();

        if (existing) {
          console.log(`   ⏭️  Product ${product.id} already exists, skipping...`);
          continue;
        }

        const productData = {
          id: product.id, // Keep existing ID if it's already in vehicle-X format
          make: product.make,
          model: product.model,
          trim: product.trim || null,
          model_year: product.modelYear || product.model_year,
          condition: product.condition,
          engine: product.engine || null,
          color: product.color || null,
          mileage: product.mileage || 0,
          price: product.price,
          status: product.status || 'active',
          images: product.images || [],
          documents: product.documents || [],
          attributes: product.attributes || [],
          description: product.description || null,
        };

        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) {
          console.error(`   ❌ Error migrating product ${product.id}:`, error.message);
          errorCount++;
        } else {
          console.log(`   ✅ Migrated product: ${product.id}`);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error migrating product ${product.id}:`, error);
        errorCount++;
      }
    }

    console.log(`   ✅ Products migration complete: ${successCount} succeeded, ${errorCount} failed\n`);
  }

  // Migrate Applications
  async function migrateApplications() {
    console.log('📋 Migrating Applications...');
    const adminApps = JSON.parse(localStorage.getItem('applications') || '[]');
    const customerApps = JSON.parse(localStorage.getItem('customer-applications') || '[]');
    const allApps = [...adminApps, ...customerApps];
    
    // Remove duplicates
    const uniqueApps = Array.from(
      new Map(allApps.map(app => [app.id, app])).values()
    );

    if (uniqueApps.length === 0) {
      console.log('   No applications to migrate');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const app of uniqueApps) {
      try {
        // Check if application already exists
        const { data: existing } = await supabase
          .from('applications')
          .select('id')
          .eq('id', app.id)
          .single();

        if (existing) {
          console.log(`   ⏭️  Application ${app.id} already exists, skipping...`);
          continue;
        }

        const appData = {
          id: app.id, // Keep existing ID
          customer_name: app.customerName || app.customer_name,
          customer_email: app.customerEmail || app.customer_email,
          customer_phone: app.customerPhone || app.customer_phone,
          vehicle_id: app.vehicleId || app.vehicle_id || null,
          offer_id: app.offerId || app.offer_id || null,
          status: app.status,
          loan_amount: app.loanAmount || app.loan_amount || 0,
          down_payment: app.downPayment || app.down_payment || 0,
          installment_plan: app.installmentPlan || app.installment_plan || null,
          documents: app.documents || [],
          submission_date: app.submissionDate || app.submission_date || null,
          contract_generated: app.contractGenerated || app.contract_generated || false,
          contract_signed: app.contractSigned || app.contract_signed || false,
          contract_data: app.contractData || app.contract_data || null,
          contract_review_comments: app.contractReviewComments || app.contract_review_comments || null,
          contract_review_date: app.contractReviewDate || app.contract_review_date || null,
          contract_signature: app.contractSignature || app.contract_signature || null,
          cancelled_by_customer: app.cancelledByCustomer || app.cancelled_by_customer || false,
          cancelled_at: app.cancelledAt || app.cancelled_at || null,
          blox_membership: app.bloxMembership || app.blox_membership || null,
        };

        const { error } = await supabase
          .from('applications')
          .insert(appData);

        if (error) {
          console.error(`   ❌ Error migrating application ${app.id}:`, error.message);
          errorCount++;
        } else {
          console.log(`   ✅ Migrated application: ${app.id}`);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error migrating application ${app.id}:`, error);
        errorCount++;
      }
    }

    console.log(`   ✅ Applications migration complete: ${successCount} succeeded, ${errorCount} failed\n`);
  }

  // Migrate Offers
  async function migrateOffers() {
    console.log('🎁 Migrating Offers...');
    const offers = JSON.parse(localStorage.getItem('offers') || '[]');
    
    if (offers.length === 0) {
      console.log('   No offers to migrate');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const offer of offers) {
      try {
        const { data: existing } = await supabase
          .from('offers')
          .select('id')
          .eq('id', offer.id)
          .single();

        if (existing) {
          console.log(`   ⏭️  Offer ${offer.id} already exists, skipping...`);
          continue;
        }

        const offerData = {
          id: offer.id,
          name: offer.name,
          annual_rent_rate: offer.annualRentRate || offer.annual_rent_rate,
          annual_rent_rate_funder: offer.annualRentRateFunder || offer.annual_rent_rate_funder,
          insurance_rate_id: offer.insuranceRateId || offer.insurance_rate_id || null,
          annual_insurance_rate: offer.annualInsuranceRate || offer.annual_insurance_rate || null,
          annual_insurance_rate_provider: offer.annualInsuranceRateProvider || offer.annual_insurance_rate_provider || null,
          is_default: offer.isDefault || offer.is_default || false,
          status: offer.status || 'active',
          is_admin: offer.isAdmin || offer.is_admin || false,
        };

        const { error } = await supabase
          .from('offers')
          .insert(offerData);

        if (error) {
          console.error(`   ❌ Error migrating offer ${offer.id}:`, error.message);
          errorCount++;
        } else {
          console.log(`   ✅ Migrated offer: ${offer.id}`);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error migrating offer ${offer.id}:`, error);
        errorCount++;
      }
    }

    console.log(`   ✅ Offers migration complete: ${successCount} succeeded, ${errorCount} failed\n`);
  }

  // Migrate Packages
  async function migratePackages() {
    console.log('📦 Migrating Packages...');
    const packages = JSON.parse(localStorage.getItem('packages') || '[]');
    
    if (packages.length === 0) {
      console.log('   No packages to migrate');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const pkg of packages) {
      try {
        const { data: existing } = await supabase
          .from('packages')
          .select('id')
          .eq('id', pkg.id)
          .single();

        if (existing) {
          console.log(`   ⏭️  Package ${pkg.id} already exists, skipping...`);
          continue;
        }

        const packageData = {
          id: pkg.id,
          name: pkg.name,
          description: pkg.description || '',
          items: pkg.items || [],
          price: pkg.price,
          status: pkg.status || 'active',
        };

        const { error } = await supabase
          .from('packages')
          .insert(packageData);

        if (error) {
          console.error(`   ❌ Error migrating package ${pkg.id}:`, error.message);
          errorCount++;
        } else {
          console.log(`   ✅ Migrated package: ${pkg.id}`);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error migrating package ${pkg.id}:`, error);
        errorCount++;
      }
    }

    console.log(`   ✅ Packages migration complete: ${successCount} succeeded, ${errorCount} failed\n`);
  }

  // Migrate Promotions
  async function migratePromotions() {
    console.log('🎉 Migrating Promotions...');
    const promotions = JSON.parse(localStorage.getItem('promotions') || '[]');
    
    if (promotions.length === 0) {
      console.log('   No promotions to migrate');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const promo of promotions) {
      try {
        const { data: existing } = await supabase
          .from('promotions')
          .select('id')
          .eq('id', promo.id)
          .single();

        if (existing) {
          console.log(`   ⏭️  Promotion ${promo.id} already exists, skipping...`);
          continue;
        }

        const promoData = {
          id: promo.id,
          name: promo.name,
          description: promo.description || '',
          discount_percentage: promo.discountType === 'percentage' ? promo.discountValue : null,
          discount_amount: promo.discountType === 'fixed' ? promo.discountValue : null,
          start_date: promo.startDate || null,
          end_date: promo.endDate || null,
          status: promo.status || 'active',
        };

        const { error } = await supabase
          .from('promotions')
          .insert(promoData);

        if (error) {
          console.error(`   ❌ Error migrating promotion ${promo.id}:`, error.message);
          errorCount++;
        } else {
          console.log(`   ✅ Migrated promotion: ${promo.id}`);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error migrating promotion ${promo.id}:`, error);
        errorCount++;
      }
    }

    console.log(`   ✅ Promotions migration complete: ${successCount} succeeded, ${errorCount} failed\n`);
  }

  // Run all migrations
  try {
    await migrateProducts();
    await migrateApplications();
    await migrateOffers();
    await migratePackages();
    await migratePromotions();
    
    console.log('🎉 Migration complete! Check Supabase Dashboard to verify your data.');
    console.log('\n💡 Tip: You can now clear localStorage if you want, as data is now in Supabase');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
})();

