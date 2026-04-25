// backend/src/config/plans.js

export const PLANS = {
    free: {
        name:          'Free',
        price_monthly: 0,
        price_yearly:  0,
        stripe_price_monthly: null,
        stripe_price_yearly:  null,
        limits: {
            clients:     5,
            projects:    3,
            invoices:    10,    // por mes
            expenses:    20,
            services:    5,
            team_members: 0,    // no multitenant
            pdf_download: true,
            email_send:  false,
            excel_export: false,
            recurring:   false,
            quotes:      false,
            stats:       false,
        },
    },
    pro: {
        name:          'Pro',
        price_monthly: 12.99,
        price_yearly:  10.39,  // -20%
        stripe_price_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
        stripe_price_yearly:  process.env.STRIPE_PRICE_PRO_YEARLY,
        limits: {
            clients:      -1,   // ilimitado
            projects:     -1,
            invoices:     -1,
            expenses:     -1,
            services:     -1,
            team_members:  0,
            pdf_download:  true,
            email_send:    true,
            excel_export:  true,
            recurring:     true,
            quotes:        true,
            stats:         true,
        },
    },
    business: {
        name:          'Business',
        price_monthly: 24.99,
        price_yearly:  19.99,
        stripe_price_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
        stripe_price_yearly:  process.env.STRIPE_PRICE_BUSINESS_YEARLY,
        limits: {
            clients:      -1,
            projects:     -1,
            invoices:     -1,
            expenses:     -1,
            services:     -1,
            team_members: -1,   // ilimitado
            pdf_download:  true,
            email_send:    true,
            excel_export:  true,
            recurring:     true,
            quotes:        true,
            stats:         true,
        },
    },
};

export const getPlan = plan => PLANS[plan] || PLANS.free;

export const canDo = (user, feature) => {
    const plan = getPlan(user?.plan || 'free');
    return plan.limits[feature] === true || plan.limits[feature] === -1;
};

export const getLimit = (user, resource) => {
    const plan = getPlan(user?.plan || 'free');
    return plan.limits[resource] ?? 0;
};