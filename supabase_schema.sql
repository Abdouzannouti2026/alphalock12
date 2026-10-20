-- ==============================================================================
-- FACTURAGO — MASTER DATABASE SCHEMA FOR SUPABASE (POSTGRESQL)
-- Ce fichier contient la création et la configuration complète de TOUTES les
-- tables, colonnes, types, index et politiques de sécurité (RLS) de A à Z.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLES PRINCIPALES (15 TABLES)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. TABLE: clients
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "clientCode" TEXT,
    client_code TEXT,
    type TEXT DEFAULT 'Entreprise',
    name TEXT NOT NULL,
    company TEXT,
    ice TEXT,
    rc TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assurer la présence des deux formats de colonnes (camelCase & snake_case)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS "clientCode" TEXT,
ADD COLUMN IF NOT EXISTS client_code TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Entreprise',
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS ice TEXT,
ADD COLUMN IF NOT EXISTS rc TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- B. TABLE: suppliers (Fournisseurs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "supplierCode" TEXT,
    supplier_code TEXT,
    type TEXT DEFAULT 'Entreprise',
    name TEXT NOT NULL,
    company TEXT,
    ice TEXT,
    rc TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS "supplierCode" TEXT,
ADD COLUMN IF NOT EXISTS supplier_code TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Entreprise',
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS ice TEXT,
ADD COLUMN IF NOT EXISTS rc TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- C. TABLE: products (Produits et Services avec Variantes et Stock)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "productCode" TEXT,
    product_code TEXT,
    barcode TEXT,
    name TEXT NOT NULL,
    description TEXT,
    "productType" TEXT DEFAULT 'Produit',
    product_type TEXT DEFAULT 'Produit',
    "unitOfMeasure" TEXT DEFAULT 'U',
    unit_of_measure TEXT DEFAULT 'U',
    "salePrice" NUMERIC DEFAULT 0,
    sale_price NUMERIC DEFAULT 0,
    "purchasePrice" NUMERIC DEFAULT 0,
    purchase_price NUMERIC DEFAULT 0,
    vat NUMERIC DEFAULT 20,
    "stockQuantity" NUMERIC DEFAULT 0,
    stock_quantity NUMERIC DEFAULT 0,
    "minStockAlert" NUMERIC DEFAULT 5,
    min_stock_alert NUMERIC DEFAULT 5,
    category TEXT,
    "hasVariants" BOOLEAN DEFAULT false,
    has_variants BOOLEAN DEFAULT false,
    variants JSONB DEFAULT '[]'::jsonb,
    "imageUrl" TEXT,
    image_url TEXT,
    "createdAt" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS "productCode" TEXT,
ADD COLUMN IF NOT EXISTS product_code TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS "productType" TEXT DEFAULT 'Produit',
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'Produit',
ADD COLUMN IF NOT EXISTS "unitOfMeasure" TEXT DEFAULT 'U',
ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'U',
ADD COLUMN IF NOT EXISTS "salePrice" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "purchasePrice" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat NUMERIC DEFAULT 20,
ADD COLUMN IF NOT EXISTS "stockQuantity" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "minStockAlert" NUMERIC DEFAULT 5,
ADD COLUMN IF NOT EXISTS min_stock_alert NUMERIC DEFAULT 5,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS "hasVariants" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS "createdAt" TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- D. TABLE: quotes (Devis)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "documentId" TEXT,
    document_id TEXT,
    "clientId" TEXT,
    client_id TEXT,
    "clientName" TEXT,
    client_name TEXT,
    date TEXT NOT NULL,
    "expiryDate" TEXT,
    expiry_date TEXT,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Brouillon',
    subject TEXT,
    "paymentMethod" TEXT,
    payment_method TEXT,
    "checkNumber" TEXT,
    check_number TEXT,
    "bankName" TEXT,
    bank_name TEXT,
    reference TEXT,
    "purchaseOrderNumber" TEXT,
    purchase_order_number TEXT,
    "showDimensions" BOOLEAN DEFAULT false,
    show_dimensions BOOLEAN DEFAULT false,
    "lineItems" JSONB DEFAULT '[]'::jsonb,
    line_items JSONB DEFAULT '[]'::jsonb,
    "subTotal" NUMERIC DEFAULT 0,
    sub_total NUMERIC DEFAULT 0,
    "vatAmount" NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    "discountType" TEXT,
    discount_type TEXT,
    "discountValue" NUMERIC,
    discount_value NUMERIC,
    transport NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS "documentId" TEXT,
ADD COLUMN IF NOT EXISTS document_id TEXT,
ADD COLUMN IF NOT EXISTS "clientId" TEXT,
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS "clientName" TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS date TEXT,
ADD COLUMN IF NOT EXISTS "expiryDate" TEXT,
ADD COLUMN IF NOT EXISTS expiry_date TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Brouillon',
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS "checkNumber" TEXT,
ADD COLUMN IF NOT EXISTS check_number TEXT,
ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS reference TEXT,
ADD COLUMN IF NOT EXISTS "purchaseOrderNumber" TEXT,
ADD COLUMN IF NOT EXISTS purchase_order_number TEXT,
ADD COLUMN IF NOT EXISTS "showDimensions" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_dimensions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "lineItems" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "subTotal" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sub_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "vatAmount" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "discountType" TEXT,
ADD COLUMN IF NOT EXISTS discount_type TEXT,
ADD COLUMN IF NOT EXISTS "discountValue" NUMERIC,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC,
ADD COLUMN IF NOT EXISTS transport NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- E. TABLE: invoices (Factures)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "documentId" TEXT,
    document_id TEXT,
    "quoteId" TEXT,
    quote_id TEXT,
    "clientId" TEXT,
    client_id TEXT,
    "clientName" TEXT,
    client_name TEXT,
    date TEXT NOT NULL,
    "dueDate" TEXT,
    due_date TEXT,
    "paymentDate" TEXT,
    payment_date TEXT,
    amount NUMERIC DEFAULT 0,
    "amountPaid" NUMERIC DEFAULT 0,
    amount_paid NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Brouillon',
    subject TEXT,
    "paymentMethod" TEXT,
    payment_method TEXT,
    "checkNumber" TEXT,
    check_number TEXT,
    "bankName" TEXT,
    bank_name TEXT,
    reference TEXT,
    "purchaseOrderNumber" TEXT,
    purchase_order_number TEXT,
    "showDimensions" BOOLEAN DEFAULT false,
    show_dimensions BOOLEAN DEFAULT false,
    "lineItems" JSONB DEFAULT '[]'::jsonb,
    line_items JSONB DEFAULT '[]'::jsonb,
    "subTotal" NUMERIC DEFAULT 0,
    sub_total NUMERIC DEFAULT 0,
    "vatAmount" NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    "discountType" TEXT,
    discount_type TEXT,
    "discountValue" NUMERIC,
    discount_value NUMERIC,
    transport NUMERIC DEFAULT 0,
    notes TEXT,
    "isGrouped" BOOLEAN DEFAULT false,
    is_grouped BOOLEAN DEFAULT false,
    "deliveryNoteIds" JSONB DEFAULT '[]'::jsonb,
    delivery_note_ids JSONB DEFAULT '[]'::jsonb,
    "groupingMode" TEXT DEFAULT 'detailed',
    grouping_mode TEXT DEFAULT 'detailed',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS "documentId" TEXT,
ADD COLUMN IF NOT EXISTS document_id TEXT,
ADD COLUMN IF NOT EXISTS "quoteId" TEXT,
ADD COLUMN IF NOT EXISTS quote_id TEXT,
ADD COLUMN IF NOT EXISTS "clientId" TEXT,
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS "clientName" TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS date TEXT,
ADD COLUMN IF NOT EXISTS "dueDate" TEXT,
ADD COLUMN IF NOT EXISTS due_date TEXT,
ADD COLUMN IF NOT EXISTS "paymentDate" TEXT,
ADD COLUMN IF NOT EXISTS payment_date TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Brouillon',
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS "checkNumber" TEXT,
ADD COLUMN IF NOT EXISTS check_number TEXT,
ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS reference TEXT,
ADD COLUMN IF NOT EXISTS "purchaseOrderNumber" TEXT,
ADD COLUMN IF NOT EXISTS purchase_order_number TEXT,
ADD COLUMN IF NOT EXISTS "showDimensions" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_dimensions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "lineItems" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "subTotal" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sub_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "vatAmount" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "discountType" TEXT,
ADD COLUMN IF NOT EXISTS discount_type TEXT,
ADD COLUMN IF NOT EXISTS "discountValue" NUMERIC,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC,
ADD COLUMN IF NOT EXISTS transport NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS "isGrouped" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_grouped BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "deliveryNoteIds" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS delivery_note_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "groupingMode" TEXT DEFAULT 'detailed',
ADD COLUMN IF NOT EXISTS grouping_mode TEXT DEFAULT 'detailed',
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- F. TABLE: delivery_notes (Bons de Livraison - BL)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "documentId" TEXT,
    document_id TEXT,
    "invoiceId" TEXT,
    invoice_id TEXT,
    "clientId" TEXT,
    client_id TEXT,
    "clientName" TEXT,
    client_name TEXT,
    date TEXT NOT NULL,
    subject TEXT,
    "paymentMethod" TEXT,
    payment_method TEXT,
    "checkNumber" TEXT,
    check_number TEXT,
    "bankName" TEXT,
    bank_name TEXT,
    reference TEXT,
    "purchaseOrderNumber" TEXT,
    purchase_order_number TEXT,
    "showDimensions" BOOLEAN DEFAULT false,
    show_dimensions BOOLEAN DEFAULT false,
    "lineItems" JSONB DEFAULT '[]'::jsonb,
    line_items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Brouillon',
    "subTotal" NUMERIC DEFAULT 0,
    sub_total NUMERIC DEFAULT 0,
    "vatAmount" NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    "totalAmount" NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    "paymentAmount" NUMERIC DEFAULT 0,
    payment_amount NUMERIC DEFAULT 0,
    "discountType" TEXT,
    discount_type TEXT,
    "discountValue" NUMERIC,
    discount_value NUMERIC,
    transport NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE delivery_notes
ADD COLUMN IF NOT EXISTS "documentId" TEXT,
ADD COLUMN IF NOT EXISTS document_id TEXT,
ADD COLUMN IF NOT EXISTS "invoiceId" TEXT,
ADD COLUMN IF NOT EXISTS invoice_id TEXT,
ADD COLUMN IF NOT EXISTS "clientId" TEXT,
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS "clientName" TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS date TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS "checkNumber" TEXT,
ADD COLUMN IF NOT EXISTS check_number TEXT,
ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS reference TEXT,
ADD COLUMN IF NOT EXISTS "purchaseOrderNumber" TEXT,
ADD COLUMN IF NOT EXISTS purchase_order_number TEXT,
ADD COLUMN IF NOT EXISTS "showDimensions" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_dimensions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "lineItems" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Brouillon',
ADD COLUMN IF NOT EXISTS "subTotal" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sub_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalAmount" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "vatAmount" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "paymentAmount" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "discountType" TEXT,
ADD COLUMN IF NOT EXISTS discount_type TEXT,
ADD COLUMN IF NOT EXISTS "discountValue" NUMERIC,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC,
ADD COLUMN IF NOT EXISTS transport NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- G. TABLE: purchase_orders (Bons de Commande Fournisseur - BC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "documentId" TEXT,
    document_id TEXT,
    "supplierId" TEXT,
    supplier_id TEXT,
    "supplierName" TEXT,
    supplier_name TEXT,
    date TEXT NOT NULL,
    "expectedDate" TEXT,
    expected_date TEXT,
    "dueDate" TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'Brouillon',
    subject TEXT,
    "paymentMethod" TEXT,
    payment_method TEXT,
    "checkNumber" TEXT,
    check_number TEXT,
    "bankName" TEXT,
    bank_name TEXT,
    reference TEXT,
    "showDimensions" BOOLEAN DEFAULT false,
    show_dimensions BOOLEAN DEFAULT false,
    "lineItems" JSONB DEFAULT '[]'::jsonb,
    line_items JSONB DEFAULT '[]'::jsonb,
    "subTotal" NUMERIC DEFAULT 0,
    sub_total NUMERIC DEFAULT 0,
    "vatAmount" NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    "totalAmount" NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    "amountPaid" NUMERIC DEFAULT 0,
    amount_paid NUMERIC DEFAULT 0,
    "discountType" TEXT,
    discount_type TEXT,
    "discountValue" NUMERIC,
    discount_value NUMERIC,
    transport NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS "documentId" TEXT,
ADD COLUMN IF NOT EXISTS document_id TEXT,
ADD COLUMN IF NOT EXISTS "supplierId" TEXT,
ADD COLUMN IF NOT EXISTS supplier_id TEXT,
ADD COLUMN IF NOT EXISTS "supplierName" TEXT,
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS date TEXT,
ADD COLUMN IF NOT EXISTS "expectedDate" TEXT,
ADD COLUMN IF NOT EXISTS expected_date TEXT,
ADD COLUMN IF NOT EXISTS "dueDate" TEXT,
ADD COLUMN IF NOT EXISTS due_date TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Brouillon',
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS "checkNumber" TEXT,
ADD COLUMN IF NOT EXISTS check_number TEXT,
ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS reference TEXT,
ADD COLUMN IF NOT EXISTS "showDimensions" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_dimensions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "lineItems" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "subTotal" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sub_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "vatAmount" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalAmount" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "discountType" TEXT,
ADD COLUMN IF NOT EXISTS discount_type TEXT,
ADD COLUMN IF NOT EXISTS "discountValue" NUMERIC,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC,
ADD COLUMN IF NOT EXISTS transport NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- H. TABLE: credit_notes (Factures d'Avoir)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "documentId" TEXT,
    document_id TEXT,
    "invoiceId" TEXT,
    invoice_id TEXT,
    "clientId" TEXT,
    client_id TEXT,
    "clientName" TEXT,
    client_name TEXT,
    date TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Brouillon',
    subject TEXT,
    "paymentMethod" TEXT,
    payment_method TEXT,
    "checkNumber" TEXT,
    check_number TEXT,
    "bankName" TEXT,
    bank_name TEXT,
    reference TEXT,
    "showDimensions" BOOLEAN DEFAULT false,
    show_dimensions BOOLEAN DEFAULT false,
    "lineItems" JSONB DEFAULT '[]'::jsonb,
    line_items JSONB DEFAULT '[]'::jsonb,
    "subTotal" NUMERIC DEFAULT 0,
    sub_total NUMERIC DEFAULT 0,
    "vatAmount" NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    "discountType" TEXT,
    discount_type TEXT,
    "discountValue" NUMERIC,
    discount_value NUMERIC,
    transport NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE credit_notes
ADD COLUMN IF NOT EXISTS "documentId" TEXT,
ADD COLUMN IF NOT EXISTS document_id TEXT,
ADD COLUMN IF NOT EXISTS "invoiceId" TEXT,
ADD COLUMN IF NOT EXISTS invoice_id TEXT,
ADD COLUMN IF NOT EXISTS "clientId" TEXT,
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS "clientName" TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS date TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Brouillon',
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS "checkNumber" TEXT,
ADD COLUMN IF NOT EXISTS check_number TEXT,
ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS reference TEXT,
ADD COLUMN IF NOT EXISTS "showDimensions" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_dimensions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "lineItems" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "subTotal" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sub_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "vatAmount" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "discountType" TEXT,
ADD COLUMN IF NOT EXISTS discount_type TEXT,
ADD COLUMN IF NOT EXISTS "discountValue" NUMERIC,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC,
ADD COLUMN IF NOT EXISTS transport NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- I. TABLE: payments (Paiements & Règlements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "invoiceId" TEXT,
    invoice_id TEXT,
    "invoiceNumber" TEXT,
    invoice_number TEXT,
    "clientId" TEXT,
    client_id TEXT,
    "clientName" TEXT,
    client_name TEXT,
    date TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    method TEXT DEFAULT 'Virement',
    reference TEXT,
    "bankName" TEXT,
    bank_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS "invoiceId" TEXT,
ADD COLUMN IF NOT EXISTS invoice_id TEXT,
ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS "clientId" TEXT,
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS "clientName" TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS date TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'Virement',
ADD COLUMN IF NOT EXISTS reference TEXT,
ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- J. TABLE: stock_movements (Mouvements de Stock Entrées/Sorties)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "productId" TEXT NOT NULL,
    product_id TEXT,
    "variantId" TEXT,
    variant_id TEXT,
    "productName" TEXT,
    product_name TEXT,
    date TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    type TEXT NOT NULL,
    reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS "productId" TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS "variantId" TEXT,
ADD COLUMN IF NOT EXISTS variant_id TEXT,
ADD COLUMN IF NOT EXISTS "productName" TEXT,
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS date TEXT,
ADD COLUMN IF NOT EXISTS quantity NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'Ajustement',
ADD COLUMN IF NOT EXISTS reference TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- K. TABLE: expenses (Dépenses & Frais)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    "purchaseOrderId" TEXT,
    purchase_order_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS date TEXT,
ADD COLUMN IF NOT EXISTS reference TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT,
ADD COLUMN IF NOT EXISTS purchase_order_id TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- L. TABLE: employees (Gestion du Personnel & Salariés)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    first_name TEXT,
    "lastName" TEXT NOT NULL,
    last_name TEXT,
    role TEXT,
    phone TEXT,
    email TEXT,
    "dailyRate" NUMERIC DEFAULT 0,
    daily_rate NUMERIC DEFAULT 0,
    "monthlySalary" NUMERIC DEFAULT 0,
    monthly_salary NUMERIC DEFAULT 0,
    "paymentType" TEXT DEFAULT 'Monthly',
    payment_type TEXT DEFAULT 'Monthly',
    "joinDate" TEXT,
    join_date TEXT,
    "isActive" BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS "firstName" TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS "lastName" TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS "dailyRate" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "monthlySalary" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "paymentType" TEXT DEFAULT 'Monthly',
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'Monthly',
ADD COLUMN IF NOT EXISTS "joinDate" TEXT,
ADD COLUMN IF NOT EXISTS join_date TEXT,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- M. TABLE: attendances (Pointage & Présences)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    employee_id TEXT,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'Present',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE attendances
ADD COLUMN IF NOT EXISTS "employeeId" TEXT,
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS date TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Present',
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- N. TABLE: salary_payments (Paiement des Salaires & Avances)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    employee_id TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    "paymentDate" TEXT NOT NULL,
    payment_date TEXT,
    "periodStart" TEXT,
    period_start TEXT,
    "periodEnd" TEXT,
    period_end TEXT,
    status TEXT DEFAULT 'Pending',
    reference TEXT,
    type TEXT DEFAULT 'Salaire',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE salary_payments
ADD COLUMN IF NOT EXISTS "employeeId" TEXT,
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "paymentDate" TEXT,
ADD COLUMN IF NOT EXISTS payment_date TEXT,
ADD COLUMN IF NOT EXISTS "periodStart" TEXT,
ADD COLUMN IF NOT EXISTS period_start TEXT,
ADD COLUMN IF NOT EXISTS "periodEnd" TEXT,
ADD COLUMN IF NOT EXISTS period_end TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS reference TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Salaire',
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- O. TABLE: returns (Retours & Service Après-Vente / Garanties)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    company_id UUID NOT NULL DEFAULT auth.uid(),
    "returnCode" TEXT,
    return_code TEXT,
    "clientName" TEXT NOT NULL,
    client_name TEXT,
    phone TEXT,
    "productName" TEXT NOT NULL,
    product_name TEXT,
    "serialNumber" TEXT NOT NULL,
    serial_number TEXT,
    date TEXT NOT NULL,
    "warrantyMonths" NUMERIC DEFAULT 12,
    warranty_months NUMERIC DEFAULT 12,
    "invoiceNumber" TEXT,
    invoice_number TEXT,
    address TEXT,
    reason TEXT,
    status TEXT DEFAULT 'Sous garantie',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE returns
ADD COLUMN IF NOT EXISTS "returnCode" TEXT,
ADD COLUMN IF NOT EXISTS return_code TEXT,
ADD COLUMN IF NOT EXISTS "clientName" TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS "productName" TEXT,
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS "serialNumber" TEXT,
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS date TEXT,
ADD COLUMN IF NOT EXISTS "warrantyMonths" NUMERIC DEFAULT 12,
ADD COLUMN IF NOT EXISTS warranty_months NUMERIC DEFAULT 12,
ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Sous garantie',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- P. TABLE: settings (Paramètres Entreprise & Personnalisation FacturaGo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID NOT NULL,
    "companyName" TEXT,
    company_name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    ice TEXT,
    rc TEXT,
    "fiscalId" TEXT,
    fiscal_id TEXT,
    patente TEXT,
    cnss TEXT,
    capital TEXT,
    logo TEXT,
    "logoWidth" NUMERIC DEFAULT 200,
    logo_width NUMERIC DEFAULT 200,
    "backgroundLogo" TEXT,
    background_logo TEXT,
    "backgroundLogoWidth" NUMERIC DEFAULT 450,
    background_logo_width NUMERIC DEFAULT 450,
    "showLogoWatermark" BOOLEAN DEFAULT true,
    show_logo_watermark BOOLEAN DEFAULT true,
    "logoWatermarkOpacity" NUMERIC DEFAULT 0.07,
    logo_watermark_opacity NUMERIC DEFAULT 0.07,
    stamp TEXT,
    "stampWidth" NUMERIC DEFAULT 220,
    stamp_width NUMERIC DEFAULT 220,
    "primaryColor" TEXT DEFAULT '#10b981',
    primary_color TEXT DEFAULT '#10b981',
    "headerTextColor" TEXT DEFAULT '#ffffff',
    header_text_color TEXT DEFAULT '#ffffff',
    "tableHeaderBgColor" TEXT DEFAULT '#10b981',
    table_header_bg_color TEXT DEFAULT '#10b981',
    "showTableBorders" BOOLEAN DEFAULT true,
    show_table_borders BOOLEAN DEFAULT true,
    "clientPosition" TEXT DEFAULT 'right',
    client_position TEXT DEFAULT 'right',
    "footerNotes" TEXT,
    footer_notes TEXT,
    "defaultPaymentTerms" TEXT,
    default_payment_terms TEXT,
    "documentColumns" JSONB,
    document_columns JSONB,
    "documentLabels" JSONB,
    document_labels JSONB,
    "showAmountInWords" BOOLEAN DEFAULT true,
    show_amount_in_words BOOLEAN DEFAULT true,
    "showSignatureRecipient" BOOLEAN DEFAULT true,
    show_signature_recipient BOOLEAN DEFAULT true,
    "priceDisplayMode" TEXT DEFAULT 'HT',
    price_display_mode TEXT DEFAULT 'HT',
    "defaultCurrencyCode" TEXT DEFAULT 'MAD',
    default_currency_code TEXT DEFAULT 'MAD',
    "invoiceNumbering" JSONB,
    invoice_numbering JSONB,
    "quoteNumbering" JSONB,
    quote_numbering JSONB,
    "deliveryNoteNumbering" JSONB,
    delivery_note_numbering JSONB,
    "purchaseOrderNumbering" JSONB,
    purchase_order_numbering JSONB,
    "creditNoteNumbering" JSONB,
    credit_note_numbering JSONB,
    "documentInfoPosition" TEXT DEFAULT 'right',
    document_info_position TEXT DEFAULT 'right',
    "showExpiryDate" BOOLEAN DEFAULT true,
    show_expiry_date BOOLEAN DEFAULT true,
    "showUnitInPDF" BOOLEAN DEFAULT false,
    show_unit_in_pdf BOOLEAN DEFAULT false,
    "defaultTva" NUMERIC DEFAULT 20,
    default_tva NUMERIC DEFAULT 20,
    "showVatSummaryTable" BOOLEAN DEFAULT true,
    show_vat_summary_table BOOLEAN DEFAULT true,
    "showTransport" BOOLEAN DEFAULT false,
    show_transport BOOLEAN DEFAULT false,
    "showTotalGlobal" BOOLEAN DEFAULT false,
    show_total_global BOOLEAN DEFAULT false,
    "defaultThermalTicketWidth" TEXT DEFAULT '80mm',
    default_thermal_ticket_width TEXT DEFAULT '80mm',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS "companyName" TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS ice TEXT,
ADD COLUMN IF NOT EXISTS rc TEXT,
ADD COLUMN IF NOT EXISTS "fiscalId" TEXT,
ADD COLUMN IF NOT EXISTS fiscal_id TEXT,
ADD COLUMN IF NOT EXISTS patente TEXT,
ADD COLUMN IF NOT EXISTS cnss TEXT,
ADD COLUMN IF NOT EXISTS capital TEXT,
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS "logoWidth" NUMERIC DEFAULT 200,
ADD COLUMN IF NOT EXISTS logo_width NUMERIC DEFAULT 200,
ADD COLUMN IF NOT EXISTS "backgroundLogo" TEXT,
ADD COLUMN IF NOT EXISTS background_logo TEXT,
ADD COLUMN IF NOT EXISTS "backgroundLogoWidth" NUMERIC DEFAULT 450,
ADD COLUMN IF NOT EXISTS background_logo_width NUMERIC DEFAULT 450,
ADD COLUMN IF NOT EXISTS "showLogoWatermark" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_logo_watermark BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "logoWatermarkOpacity" NUMERIC DEFAULT 0.07,
ADD COLUMN IF NOT EXISTS logo_watermark_opacity NUMERIC DEFAULT 0.07,
ADD COLUMN IF NOT EXISTS stamp TEXT,
ADD COLUMN IF NOT EXISTS "stampWidth" NUMERIC DEFAULT 220,
ADD COLUMN IF NOT EXISTS stamp_width NUMERIC DEFAULT 220,
ADD COLUMN IF NOT EXISTS "primaryColor" TEXT DEFAULT '#10b981',
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#10b981',
ADD COLUMN IF NOT EXISTS "headerTextColor" TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS header_text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS "tableHeaderBgColor" TEXT DEFAULT '#10b981',
ADD COLUMN IF NOT EXISTS table_header_bg_color TEXT DEFAULT '#10b981',
ADD COLUMN IF NOT EXISTS "showTableBorders" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_table_borders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "clientPosition" TEXT DEFAULT 'right',
ADD COLUMN IF NOT EXISTS client_position TEXT DEFAULT 'right',
ADD COLUMN IF NOT EXISTS "footerNotes" TEXT,
ADD COLUMN IF NOT EXISTS footer_notes TEXT,
ADD COLUMN IF NOT EXISTS "defaultPaymentTerms" TEXT,
ADD COLUMN IF NOT EXISTS default_payment_terms TEXT,
ADD COLUMN IF NOT EXISTS "documentColumns" JSONB,
ADD COLUMN IF NOT EXISTS document_columns JSONB,
ADD COLUMN IF NOT EXISTS "documentLabels" JSONB,
ADD COLUMN IF NOT EXISTS document_labels JSONB,
ADD COLUMN IF NOT EXISTS "showAmountInWords" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_amount_in_words BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "showSignatureRecipient" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_signature_recipient BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "priceDisplayMode" TEXT DEFAULT 'HT',
ADD COLUMN IF NOT EXISTS price_display_mode TEXT DEFAULT 'HT',
ADD COLUMN IF NOT EXISTS "defaultCurrencyCode" TEXT DEFAULT 'MAD',
ADD COLUMN IF NOT EXISTS default_currency_code TEXT DEFAULT 'MAD',
ADD COLUMN IF NOT EXISTS "invoiceNumbering" JSONB,
ADD COLUMN IF NOT EXISTS invoice_numbering JSONB,
ADD COLUMN IF NOT EXISTS "quoteNumbering" JSONB,
ADD COLUMN IF NOT EXISTS quote_numbering JSONB,
ADD COLUMN IF NOT EXISTS "deliveryNoteNumbering" JSONB,
ADD COLUMN IF NOT EXISTS delivery_note_numbering JSONB,
ADD COLUMN IF NOT EXISTS "purchaseOrderNumbering" JSONB,
ADD COLUMN IF NOT EXISTS purchase_order_numbering JSONB,
ADD COLUMN IF NOT EXISTS "creditNoteNumbering" JSONB,
ADD COLUMN IF NOT EXISTS credit_note_numbering JSONB,
ADD COLUMN IF NOT EXISTS "documentInfoPosition" TEXT DEFAULT 'right',
ADD COLUMN IF NOT EXISTS document_info_position TEXT DEFAULT 'right',
ADD COLUMN IF NOT EXISTS "showExpiryDate" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_expiry_date BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "showUnitInPDF" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_unit_in_pdf BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "defaultTva" NUMERIC DEFAULT 20,
ADD COLUMN IF NOT EXISTS default_tva NUMERIC DEFAULT 20,
ADD COLUMN IF NOT EXISTS "showVatSummaryTable" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_vat_summary_table BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "showTransport" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_transport BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "showTotalGlobal" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_total_global BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "defaultThermalTicketWidth" TEXT DEFAULT '80mm',
ADD COLUMN IF NOT EXISTS default_thermal_ticket_width TEXT DEFAULT '80mm',
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ==============================================================================
-- 3. INDEXES DE HAUTE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_company_id ON delivery_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_attendances_company_id ON attendances(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_company_id ON salary_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_settings_company_id ON settings(company_id);

-- Pagination composite indexes
CREATE INDEX IF NOT EXISTS idx_products_company_pagination ON products(company_id, id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_pagination ON invoices(company_id, id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_pagination ON quotes(company_id, id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_company_pagination ON delivery_notes(company_id, id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_pagination ON purchase_orders(company_id, id);
CREATE INDEX IF NOT EXISTS idx_payments_company_pagination ON payments(company_id, id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_pagination ON stock_movements(company_id, id);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & POLITIQUES
-- ==============================================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS de séparation stricte par utilisateur (Isolation 100% garantie)
-- Chaque utilisateur ne peut voir, insérer, modifier ou supprimer QUE ses propres données
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'clients', 'suppliers', 'products', 'quotes', 'invoices', 
            'delivery_notes', 'purchase_orders', 'credit_notes', 'payments', 
            'stock_movements', 'expenses', 'employees', 'attendances', 
            'salary_payments', 'settings'
        ])
    LOOP
        -- Définir auth.uid() par défaut pour company_id et user_id
        EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET DEFAULT auth.uid();', tbl);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id SET DEFAULT auth.uid();', tbl);

        -- Remplacer par des politiques d'isolation stricte
        EXECUTE format('DROP POLICY IF EXISTS %I_user_policy ON %I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_user_isolation ON %I;', tbl, tbl);
        EXECUTE format('
            CREATE POLICY %I_user_isolation ON %I
            FOR ALL
            TO authenticated
            USING (auth.uid() = company_id OR auth.uid() = user_id)
            WITH CHECK (auth.uid() = company_id OR auth.uid() = user_id);
        ', tbl, tbl);
    END LOOP;
END $$;

-- 5. TRIGGER AUTOMATIQUE : CRÉATION DES PARAMÈTRES POUR CHAQUE NOUVEL UTILISATEUR
-- Quand tu ajoutes un user dans Supabase Auth (Dashboard > Authentication > Users),
-- une ligne de paramètres par défaut est créée automatiquement pour lui !
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.settings (
        id,
        user_id,
        company_id,
        "companyName",
        company_name,
        "primaryColor",
        primary_color,
        "headerTextColor",
        header_text_color,
        "tableHeaderBgColor",
        table_header_bg_color,
        "defaultCurrencyCode",
        default_currency_code,
        "defaultTva",
        default_tva,
        "priceDisplayMode",
        price_display_mode,
        "showAmountInWords",
        show_amount_in_words,
        "showTableBorders",
        show_table_borders,
        "clientPosition",
        client_position
    ) VALUES (
        gen_random_uuid(),
        NEW.id,
        NEW.id,
        'Mon Entreprise',
        'Mon Entreprise',
        '#10b981',
        '#10b981',
        '#ffffff',
        '#ffffff',
        '#10b981',
        '#10b981',
        'MAD',
        'MAD',
        20,
        20,
        'HT',
        'HT',
        true,
        true,
        true,
        true,
        'right',
        'right'
    )
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- 6. ACCORDER LES PRIVILÈGES
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

