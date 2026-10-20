
import { Client, Product, Supplier, Quote, Invoice, CompanySettings, Payment, StockMovement, DeliveryNote, PurchaseOrder, CreditNote, Expense, Employee, Attendance, SalaryPayment, WarrantyReturn } from './types';
import { supabase } from './supabaseClient';

const TABLE_MAP: Record<string, string> = {
    'clients': 'clients',
    'products': 'products',
    'suppliers': 'suppliers',
    'quotes': 'quotes',
    'invoices': 'invoices',
    'credit_notes': 'credit_notes',
    'settings': 'settings',
    'payments': 'payments',
    'stock_movements': 'stock_movements',
    'delivery_notes': 'delivery_notes',
    'purchase_orders': 'purchase_orders',
    'expenses': 'expenses',
    'employees': 'employees',
    'attendances': 'attendances',
    'salary_payments': 'salary_payments',
    'returns': 'returns'
};

const LOCAL_STORAGE_KEYS = {
    SHOW_AMOUNT_IN_WORDS: 'facturago_show_amount_in_words',
    DOCUMENT_INFO_POSITION: 'facturago_document_info_position',
    SHOW_EXPIRY_DATE: 'facturago_show_expiry_date',
    LOGO_WIDTH: 'facturago_logo_width',
    BACKGROUND_LOGO: 'facturago_background_logo',
    BACKGROUND_LOGO_WIDTH: 'facturago_background_logo_width',
    STAMP_WIDTH: 'facturago_stamp_width',
    SHOW_LOGO_WATERMARK: 'facturago_show_logo_watermark',
    LOGO_WATERMARK_OPACITY: 'facturago_logo_watermark_opacity',
    HEADER_TEXT_COLOR: 'facturago_header_text_color',
    TABLE_HEADER_BG_COLOR: 'facturago_table_header_bg_color',
    SHOW_TABLE_BORDERS: 'facturago_show_table_borders',
    CLIENT_POSITION: 'facturago_client_position',
    DEFAULT_CURRENCY_CODE: 'settings_default_currency_code',
    DEFAULT_TVA: 'settings_default_tva',
    SHOW_VAT_SUMMARY_TABLE: 'facturago_show_vat_summary_table',
    SHOW_TRANSPORT: 'facturago_show_transport',
    SHOW_TOTAL_GLOBAL: 'facturago_show_total_global'
};

const SETTINGS_DB_COLUMNS = new Set([
    'companyName',
    'company_name',
    'address',
    'phone',
    'email',
    'website',
    'ice',
    'rc',
    'fiscalId',
    'fiscal_id',
    'patente',
    'cnss',
    'capital',
    'logo',
    'logoWidth',
    'logo_width',
    'backgroundLogo',
    'background_logo',
    'backgroundLogoWidth',
    'background_logo_width',
    'showLogoWatermark',
    'show_logo_watermark',
    'logoWatermarkOpacity',
    'logo_watermark_opacity',
    'stamp',
    'stampWidth',
    'stamp_width',
    'primaryColor',
    'primary_color',
    'headerTextColor',
    'header_text_color',
    'tableHeaderBgColor',
    'table_header_bg_color',
    'showTableBorders',
    'show_table_borders',
    'clientPosition',
    'client_position',
    'footerNotes',
    'footer_notes',
    'defaultPaymentTerms',
    'default_payment_terms',
    'documentLabels',
    'document_labels',
    'documentColumns',
    'document_columns',
    'showAmountInWords',
    'show_amount_in_words',
    'showSignatureRecipient',
    'show_signature_recipient',
    'priceDisplayMode',
    'price_display_mode',
    'defaultCurrencyCode',
    'default_currency_code',
    'invoiceNumbering',
    'invoice_numbering',
    'quoteNumbering',
    'quote_numbering',
    'deliveryNoteNumbering',
    'delivery_note_numbering',
    'purchaseOrderNumbering',
    'purchase_order_numbering',
    'creditNoteNumbering',
    'credit_note_numbering',
    'documentInfoPosition',
    'document_info_position',
    'showExpiryDate',
    'show_expiry_date',
    'showUnitInPDF',
    'show_unit_in_pdf',
    'defaultTva',
    'default_tva',
    'showVatSummaryTable',
    'show_vat_summary_table',
    'showTransport',
    'show_transport',
    'showTotalGlobal',
    'show_total_global',
    'defaultThermalTicketWidth',
    'default_thermal_ticket_width'
]);

const safeSetItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn(`Local storage quota exceeded for key "${key}". Truncating gracefully.`);
            try {
                if (key === 'facturago_company_settings') {
                    const parsed = JSON.parse(value);
                    delete parsed.logo;
                    delete parsed.backgroundLogo;
                    delete parsed.stamp;
                    localStorage.setItem(key, JSON.stringify(parsed));
                } else if (key === 'facturago_background_logo') {
                    localStorage.removeItem(key);
                }
            } catch (innerErr) {
                // Ignore gracefully
            }
        } else {
            console.warn(`Failed to write to localStorage for key "${key}":`, e);
        }
    }
};

const safeRemoveItem = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch (innerErr) {
        // Ignore gracefully
    }
};

export const initDB = async (): Promise<any> => {
    return Promise.resolve(true);
};

let cachedUserId: string | null = null;
let cachedCompanyId: string | null = null;
let pendingCompanyPromise: Promise<{ userId: string | null, companyId: string | null }> | null = null;

export const resetDBCache = () => {
    cachedUserId = null;
    cachedCompanyId = null;
    pendingCompanyPromise = null;
};

export const getCurrentUserAndCompany = async () => {
    return retry(async () => {
        try {
            const sessionResponse = await supabase.auth.getSession().catch(err => {
                console.warn("getSession error caught:", err);
                return { data: { session: null }, error: err };
            });
            const session = sessionResponse?.data?.session || null;
            const authError = sessionResponse?.error;

            if (authError) {
                const errMsg = (authError.message || (typeof authError === 'string' ? authError : '') || '').toLowerCase();
                if (
                    errMsg.includes('refresh token') || 
                    errMsg.includes('jwt') || 
                    errMsg.includes('invalid') || 
                    errMsg.includes('auth session') ||
                    errMsg.includes('not_found') ||
                    errMsg.includes('invalid_grant')
                ) {
                    console.warn("Auth session error in getCurrentUserAndCompany, clearing session:", errMsg);
                    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                        const key = localStorage.key(i);
                        if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
                            localStorage.removeItem(key);
                        }
                    }
                    return { userId: null, companyId: null };
                }
            }

            const currentUserId = session?.user?.id || null;

            // Clear cache if user changed
            if (currentUserId !== cachedUserId) {
                cachedUserId = currentUserId;
                cachedCompanyId = null;
                pendingCompanyPromise = null;
            }

            if (!currentUserId) return { userId: null, companyId: null };
            if (cachedCompanyId) return { userId: currentUserId, companyId: cachedCompanyId };

            if (pendingCompanyPromise) return pendingCompanyPromise;

            pendingCompanyPromise = (async () => {
                // Fallback: The user is the owner, userId is the companyId
                cachedCompanyId = currentUserId;
                return { userId: currentUserId, companyId: currentUserId };
            })();

            return pendingCompanyPromise;
        } catch (e: any) {
            console.error("Error in getCurrentUserAndCompany:", e);
            const errMsg = (e?.message || '').toLowerCase();
            if (errMsg.includes('refresh token') || errMsg.includes('invalid') || errMsg.includes('not_found') || errMsg.includes('invalid_grant')) {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
                        localStorage.removeItem(key);
                    }
                }
                return { userId: null, companyId: null };
            }
            if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
                throw e; // Let retry handle it
            }
            return { userId: null, companyId: null };
        }
    });
};

// Listen for auth changes to update the cache
supabase.auth.onAuthStateChange((_event, session) => {
    cachedUserId = session?.user?.id || null;
    cachedCompanyId = null; // Reset company cache to force re-fetch
});

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 120000): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("La requête a expiré. La base de données est peut-être en train de démarrer (peut prendre jusqu'à 2 minutes).")), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
};

async function retry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const isNetworkError = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError';
            const isTimeout = err?.message?.includes('expiré');
            
            if (isNetworkError || isTimeout) {
                console.warn(`Retry ${i + 1}/${maxRetries} after error:`, err.message);
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i))); 
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

const handleAuthError = async (error: any) => {
    const msg = (error?.message || (typeof error === 'string' ? error : '') || '').toLowerCase();
    if (
        msg.includes('jwt') ||
        msg.includes('expired') ||
        msg.includes('refresh token') ||
        msg.includes('invalid refresh') ||
        msg.includes('auth session missing') ||
        msg.includes('not_found') ||
        error?.code === 'PGRST301' ||
        error?.status === 401 ||
        error?.status === 400
    ) {
        console.warn("Auth error detected, cleaning up auth session:", msg);
        try {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
                    localStorage.removeItem(key);
                }
            }
            if (!window.location.hash.includes('/login')) {
                window.location.hash = '#/login';
            }
            return false;
        } catch (e) {
            console.error("Exception during auth error cleanup:", e);
            return false;
        }
    }
    return false;
};

const isSchemaError = (error: any): boolean => {
    if (!error) return false;
    const code = error.code || '';
    const msg = ((error.message || '') + ' ' + (error.details || '') + ' ' + (error.hint || '')).toLowerCase();
    return (
        code === 'PGRST204' ||
        code === 'PGRST205' ||
        code === '42P01' ||
        code === '42703' ||
        msg.includes('column') ||
        msg.includes('does not exist') ||
        msg.includes('not found') ||
        msg.includes('schema cache')
    );
};

const extractMissingColumn = (error: any): string | null => {
    if (!error) return null;
    const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
    const match1 = msg.match(/column "?([a-zA-Z0-9_]+)"? of/i);
    if (match1 && match1[1]) return match1[1];
    const match2 = msg.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i);
    if (match2 && match2[1]) return match2[1];
    const match3 = msg.match(/find the ['"]?([a-zA-Z0-9_]+)['"]? column/i);
    if (match3 && match3[1]) return match3[1];
    const match4 = msg.match(/['"]?([a-zA-Z0-9_]+)['"]? column of/i);
    if (match4 && match4[1]) return match4[1];
    return null;
};

const normalizeRowFromDB = (tableName: string, raw: any): any => {
    if (!raw || typeof raw !== 'object') return raw;
    const item = { ...raw };

    if (tableName === 'clients') {
        return {
            id: item.id,
            clientCode: item.clientCode ?? item.client_code ?? '',
            type: item.type ?? 'Entreprise',
            name: item.name ?? '',
            company: item.company ?? undefined,
            ice: item.ice ?? undefined,
            rc: item.rc ?? undefined,
            email: item.email ?? '',
            phone: item.phone ?? '',
            address: item.address ?? undefined
        };
    }

    if (tableName === 'suppliers') {
        return {
            id: item.id,
            supplierCode: item.supplierCode ?? item.supplier_code ?? '',
            type: item.type ?? 'Entreprise',
            name: item.name ?? '',
            company: item.company ?? undefined,
            ice: item.ice ?? undefined,
            rc: item.rc ?? undefined,
            email: item.email ?? '',
            phone: item.phone ?? '',
            address: item.address ?? undefined
        };
    }

    if (tableName === 'products') {
        return {
            id: item.id,
            productCode: item.productCode ?? item.product_code ?? '',
            barcode: item.barcode ?? undefined,
            name: item.name ?? '',
            description: item.description ?? '',
            productType: item.productType ?? item.product_type ?? 'Produit',
            unitOfMeasure: item.unitOfMeasure ?? item.unit_of_measure ?? 'U',
            salePrice: Number(item.salePrice ?? item.sale_price ?? 0),
            purchasePrice: Number(item.purchasePrice ?? item.purchase_price ?? 0),
            vat: Number(item.vat ?? 0),
            stockQuantity: Number(item.stockQuantity ?? item.stock_quantity ?? 0),
            minStockAlert: Number(item.minStockAlert ?? item.min_stock_alert ?? 0),
            category: item.category ?? undefined,
            hasVariants: Boolean(item.hasVariants ?? item.has_variants ?? false),
            variants: Array.isArray(item.variants) ? item.variants : [],
            imageUrl: item.imageUrl ?? item.image_url ?? undefined,
            createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString().split('T')[0]
        };
    }

    if (['quotes', 'invoices', 'delivery_notes', 'purchase_orders', 'credit_notes'].includes(tableName)) {
        let lineItems = item.lineItems ?? item.line_items ?? [];
        if (typeof lineItems === 'string') {
            try { lineItems = JSON.parse(lineItems); } catch (_) { lineItems = []; }
        }
        const firstItem = Array.isArray(lineItems) ? lineItems[0] : undefined;

        const subTotal = Number(item.subTotal ?? item.sub_total ?? (firstItem?.subTotal ?? 0));
        const vatAmount = Number(item.vatAmount ?? item.vat_amount ?? (firstItem?.vatAmount ?? 0));
        const totalAmount = Number(item.totalAmount ?? item.total_amount ?? item.amount ?? (firstItem?.totalAmount ?? 0));
        const amount = Number(item.amount ?? item.totalAmount ?? item.total_amount ?? (firstItem?.amount ?? (subTotal + vatAmount)));
        const amountPaid = Number(item.amountPaid ?? item.amount_paid ?? item.paymentAmount ?? item.payment_amount ?? 0);

        const discountType = item.discountType ?? item.discount_type ?? firstItem?.discountType;
        const discountValue = item.discountValue !== undefined && item.discountValue !== null 
            ? Number(item.discountValue) 
            : (item.discount_value !== undefined && item.discount_value !== null 
                ? Number(item.discount_value) 
                : (firstItem?.discountValue !== undefined ? Number(firstItem.discountValue) : undefined));

        const transport = Number(item.transport ?? (firstItem?.transport ?? 0));

        let deliveryNoteIds = item.deliveryNoteIds ?? item.delivery_note_ids ?? firstItem?.deliveryNoteIds;
        if (typeof deliveryNoteIds === 'string') {
            try { deliveryNoteIds = JSON.parse(deliveryNoteIds); } catch (_) { deliveryNoteIds = []; }
        }

        const normalized: any = {
            id: item.id,
            documentId: item.documentId ?? item.document_id ?? item.id,
            date: item.date ?? '',
            status: item.status ?? 'Brouillon',
            subject: item.subject ?? firstItem?.subject ?? undefined,
            paymentMethod: item.paymentMethod ?? item.payment_method ?? firstItem?.paymentMethod ?? undefined,
            checkNumber: item.checkNumber ?? item.check_number ?? firstItem?.checkNumber ?? undefined,
            bankName: item.bankName ?? item.bank_name ?? firstItem?.bankName ?? undefined,
            reference: item.reference ?? firstItem?.reference ?? undefined,
            purchaseOrderNumber: item.purchaseOrderNumber ?? item.purchase_order_number ?? firstItem?.purchaseOrderNumber ?? undefined,
            showDimensions: item.showDimensions !== undefined ? Boolean(item.showDimensions) : (item.show_dimensions !== undefined ? Boolean(item.show_dimensions) : (firstItem?.showDimensions !== undefined ? Boolean(firstItem.showDimensions) : false)),
            calculationMode: item.calculationMode ?? item.calculation_mode ?? firstItem?.calculationMode ?? 'piece',
            lineItems: Array.isArray(lineItems) ? lineItems : [],
            subTotal,
            vatAmount,
            amount,
            discountType,
            discountValue,
            transport,
            notes: item.notes ?? firstItem?.notes ?? undefined
        };

        if (tableName === 'quotes') {
            normalized.clientId = item.clientId ?? item.client_id ?? '';
            normalized.clientName = item.clientName ?? item.client_name ?? '';
            normalized.expiryDate = item.expiryDate ?? item.expiry_date ?? firstItem?.expiryDate ?? '';
        } else if (tableName === 'invoices') {
            normalized.quoteId = item.quoteId ?? item.quote_id ?? undefined;
            normalized.clientId = item.clientId ?? item.client_id ?? '';
            normalized.clientName = item.clientName ?? item.client_name ?? '';
            normalized.dueDate = item.dueDate ?? item.due_date ?? firstItem?.dueDate ?? '';
            normalized.paymentDate = item.paymentDate ?? item.payment_date ?? undefined;
            normalized.amountPaid = amountPaid;
            normalized.isGrouped = Boolean(item.isGrouped ?? item.is_grouped ?? firstItem?.isGrouped ?? false);
            normalized.deliveryNoteIds = deliveryNoteIds;
            normalized.groupingMode = item.groupingMode ?? item.grouping_mode ?? firstItem?.groupingMode ?? 'detailed';
        } else if (tableName === 'delivery_notes') {
            normalized.invoiceId = item.invoiceId ?? item.invoice_id ?? undefined;
            normalized.clientId = item.clientId ?? item.client_id ?? '';
            normalized.clientName = item.clientName ?? item.client_name ?? '';
            normalized.totalAmount = totalAmount || amount;
            normalized.paymentAmount = amountPaid;
        } else if (tableName === 'purchase_orders') {
            normalized.supplierId = item.supplierId ?? item.supplier_id ?? '';
            normalized.supplierName = item.supplierName ?? item.supplier_name ?? '';
            normalized.expectedDate = item.expectedDate ?? item.expected_date ?? firstItem?.expectedDate ?? undefined;
            normalized.dueDate = item.dueDate ?? item.due_date ?? firstItem?.dueDate ?? undefined;
            normalized.totalAmount = totalAmount || amount;
            normalized.amountPaid = amountPaid;
        } else if (tableName === 'credit_notes') {
            normalized.invoiceId = item.invoiceId ?? item.invoice_id ?? undefined;
            normalized.clientId = item.clientId ?? item.client_id ?? '';
            normalized.clientName = item.clientName ?? item.client_name ?? '';
        }

        return normalized;
    }

    if (tableName === 'payments') {
        return {
            id: item.id,
            invoiceId: item.invoiceId ?? item.invoice_id ?? '',
            invoiceNumber: item.invoiceNumber ?? item.invoice_number ?? '',
            clientId: item.clientId ?? item.client_id ?? '',
            clientName: item.clientName ?? item.client_name ?? '',
            date: item.date ?? '',
            amount: Number(item.amount ?? 0),
            method: item.method ?? 'Virement',
            reference: item.reference ?? undefined,
            bankName: item.bankName ?? item.bank_name ?? undefined,
            notes: item.notes ?? undefined
        };
    }

    if (tableName === 'stock_movements') {
        return {
            id: item.id,
            productId: item.productId ?? item.product_id ?? '',
            variantId: item.variantId ?? item.variant_id ?? undefined,
            productName: item.productName ?? item.product_name ?? '',
            date: item.date ?? '',
            quantity: Number(item.quantity ?? 0),
            type: item.type ?? 'Ajustement',
            reference: item.reference ?? undefined
        };
    }

    if (tableName === 'expenses') {
        return {
            id: item.id,
            category: item.category ?? '',
            description: item.description ?? '',
            amount: Number(item.amount ?? 0),
            date: item.date ?? '',
            reference: item.reference ?? undefined,
            notes: item.notes ?? undefined,
            purchaseOrderId: item.purchaseOrderId ?? item.purchase_order_id ?? undefined
        };
    }

    if (tableName === 'employees') {
        return {
            id: item.id,
            firstName: item.firstName ?? item.first_name ?? '',
            lastName: item.lastName ?? item.last_name ?? '',
            role: item.role ?? '',
            phone: item.phone ?? '',
            email: item.email ?? undefined,
            dailyRate: Number(item.dailyRate ?? item.daily_rate ?? 0),
            monthlySalary: Number(item.monthlySalary ?? item.monthly_salary ?? 0),
            paymentType: item.paymentType ?? item.payment_type ?? 'Monthly',
            joinDate: item.joinDate ?? item.join_date ?? '',
            isActive: item.isActive !== undefined ? Boolean(item.isActive) : (item.is_active !== undefined ? Boolean(item.is_active) : true)
        };
    }

    if (tableName === 'attendances') {
        return {
            id: item.id,
            employeeId: item.employeeId ?? item.employee_id ?? '',
            date: item.date ?? '',
            status: item.status ?? 'Present',
            note: item.note ?? undefined
        };
    }

    if (tableName === 'salary_payments') {
        return {
            id: item.id,
            employeeId: item.employeeId ?? item.employee_id ?? '',
            amount: Number(item.amount ?? 0),
            paymentDate: item.paymentDate ?? item.payment_date ?? '',
            periodStart: item.periodStart ?? item.period_start ?? '',
            periodEnd: item.periodEnd ?? item.period_end ?? '',
            status: item.status ?? 'Pending',
            reference: item.reference ?? undefined,
            type: item.type ?? 'Salaire',
            note: item.note ?? undefined
        };
    }

    if (tableName === 'returns' || tableName === 'warranty_returns') {
        return {
            id: item.id,
            returnCode: item.returnCode ?? item.return_code ?? '',
            clientName: item.clientName ?? item.client_name ?? '',
            phone: item.phone ?? '',
            productName: item.productName ?? item.product_name ?? '',
            serialNumber: item.serialNumber ?? item.serial_number ?? item.barcode ?? '',
            date: item.date ?? new Date().toISOString().split('T')[0],
            warrantyMonths: Number(item.warrantyMonths ?? item.warranty_months ?? 12),
            invoiceNumber: item.invoiceNumber ?? item.invoice_number ?? undefined,
            address: item.address ?? undefined,
            reason: item.reason ?? undefined,
            status: item.status ?? 'Sous garantie',
            notes: item.notes ?? undefined,
            companyId: item.companyId ?? item.company_id ?? undefined,
            userId: item.userId ?? item.user_id ?? undefined,
            createdAt: item.createdAt ?? item.created_at ?? undefined
        };
    }

    return item;
};

const preparePayload = (tableName: string, item: any, userId?: string, companyId?: string): any => {
    const originalItem = { ...item };
    delete originalItem.initialPayment;
    delete originalItem.userId;
    delete originalItem.created_at;

    // Back up document metadata in lineItems[0] for redundancy and legacy schema resilience
    const lineItems = originalItem.lineItems || originalItem.line_items;
    if (Array.isArray(lineItems) && lineItems.length > 0) {
        lineItems[0] = {
            ...lineItems[0],
            subject: originalItem.subject,
            notes: originalItem.notes,
            paymentMethod: originalItem.paymentMethod,
            checkNumber: originalItem.checkNumber,
            bankName: originalItem.bankName,
            purchaseOrderNumber: originalItem.purchaseOrderNumber,
            dueDate: originalItem.dueDate,
            expiryDate: originalItem.expiryDate,
            expectedDate: originalItem.expectedDate,
            showDimensions: originalItem.showDimensions,
            calculationMode: originalItem.calculationMode,
            isGrouped: originalItem.isGrouped,
            deliveryNoteIds: originalItem.deliveryNoteIds,
            groupingMode: originalItem.groupingMode,
            discountType: originalItem.discountType,
            discountValue: originalItem.discountValue,
            transport: originalItem.transport
        };
        originalItem.lineItems = lineItems;
    }

    if (['quotes', 'invoices'].includes(tableName)) {
        delete originalItem.totalAmount;
    }

    const payload: any = { ...originalItem };
    if (userId) payload.user_id = userId;
    if (companyId) payload.company_id = companyId;

    return payload;
};

const getAll = async <T>(storeName: string): Promise<T[]> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    return retry(async () => {
        try {
            const { companyId } = await getCurrentUserAndCompany();
            if (!companyId) return [];

            let allData: any[] = [];
            let hasMore = true;
            let offset = 0;
            let currentBatchSize = 200; // Start with 200, will decrease on timeout

            while (hasMore) {
                try {
                    // Optimization: Always filter by company_id FIRST if available
                    let queryBuilder = supabase.from(tableName).select('*');
                    
                    if (companyId) {
                        queryBuilder = queryBuilder.eq('company_id', companyId);
                    }
                    
                    // Then order and apply range
                    const fetchPromise = queryBuilder
                        .order('id', { ascending: true })
                        .range(offset, offset + currentBatchSize - 1);
                    
                    // Using a slightly shorter timeout for the chunk to detect issues early
                    const result: any = await withTimeout(Promise.resolve(fetchPromise), 45000);
                    const { data, error } = result;

                    if (error) {
                        // If we get a timeout, try with a MUCH smaller batch size
                        if (error.code === '57014' || error.message?.includes('timeout') || error.message?.includes('expiré')) {
                            console.warn(`Timeout detected for ${storeName} at offset ${offset}, reducing batch size...`);
                            if (currentBatchSize <= 10) {
                                throw error; // Cannot go smaller, throw the original error
                            }
                            currentBatchSize = Math.floor(currentBatchSize / 2);
                            continue; // Retry same offset with smaller batch
                        }

                        if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
                            throw error; // Let outer retry catch it
                        }

                        // Check if it's a schema error
                        if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST205' || (error.message && (error.message.includes('column') || error.message.includes('table') || error.message.includes('schema cache')) && error.message.includes('does not exist'))) {
                            console.warn(`Table or column missing for ${storeName}, returning local fallback array:`, error.message);
                            try {
                                const localKey = `facturago_local_${tableName}`;
                                const currentRaw = localStorage.getItem(localKey);
                                if (currentRaw) {
                                    const arr = JSON.parse(currentRaw);
                                    if (Array.isArray(arr)) {
                                        return arr.map(item => normalizeRowFromDB(tableName, item)) as T[];
                                    }
                                }
                            } catch (_) {}
                            return [];
                        }

                        const recovered = await handleAuthError(error);
                        if (recovered) continue; // Retry after auth refresh
                        
                        throw error;
                    }

                    if (data && data.length > 0) {
                        allData = [...allData, ...data];
                        offset += data.length;
                    }

                    if (!data || data.length < currentBatchSize) {
                        hasMore = false;
                    } else {
                        // Small delay between batches to let the database breathe
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                } catch (e: any) {
                    // Handle timeout errors that bubble up from withTimeout
                    if (e.message?.includes('expiré') || e.code === '57014') {
                        console.warn(`Catch block timeout for ${storeName} at offset ${offset}, reducing batch size...`);
                        if (currentBatchSize <= 10) throw e;
                        currentBatchSize = Math.floor(currentBatchSize / 2);
                        continue;
                    }
                    throw e;
                }
            }

            // Normalize all records from DB ensuring complete camelCase & snake_case column binding
            const normalizedData = allData.map(item => normalizeRowFromDB(tableName, item));
            return normalizedData as T[];
        } catch (e: any) {
            if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
                throw e; // Let retry handle it
            }
            if (await handleAuthError(e)) {
                return getAll(storeName);
            }
            throw e;
        }
    });
};

const add = async <T>(storeName: string, item: T): Promise<T> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    try {
        const { userId, companyId } = await getCurrentUserAndCompany();
        if (!userId || !companyId) throw new Error("User not authenticated");

        const originalItem = { ...item } as any;
        let payload = preparePayload(tableName, originalItem, userId, companyId);

        let result: any = await withTimeout(supabase.from(tableName).insert(payload).select().single() as any);

        let retryCount = 0;
        while (result?.error && isSchemaError(result.error) && retryCount < 15) {
            retryCount++;
            console.warn(`Schema error detected when adding to ${storeName}:`, result.error.message);
            const missingCol = extractMissingColumn(result.error);
            if (missingCol && missingCol in payload) {
                console.warn(`Removing missing column '${missingCol}' from payload and retrying insert...`);
                delete payload[missingCol];
            } else {
                const optionalCols = [
                    'createdAt', 'purchaseOrderId', 'showDimensions', 'calculationMode', 
                    'isGrouped', 'deliveryNoteIds', 'groupingMode', 'discountType', 
                    'discountValue', 'transport', 'expectedDate', 'expiryDate', 
                    'dueDate', 'subject', 'paymentMethod', 'checkNumber', 'bankName', 
                    'purchaseOrderNumber', 'notes'
                ];
                let strippedAny = false;
                for (const col of optionalCols) {
                    if (col in payload) {
                        delete payload[col];
                        strippedAny = true;
                        break;
                    }
                }
                if (!strippedAny) break;
            }

            result = await withTimeout(supabase.from(tableName).insert(payload).select().single() as any);
        }

        const { data, error } = result;

        if (error) {
            if (error.code === 'PGRST205' || error.code === '42P01' || (error.message && (error.message.includes('table') || error.message.includes('schema cache')) && error.message.includes('does not exist'))) {
                console.warn(`Table '${tableName}' missing in Supabase schema cache, saving item locally:`, originalItem);
                const localKey = `facturago_local_${tableName}`;
                try {
                    const currentRaw = localStorage.getItem(localKey);
                    const currentArr = currentRaw ? JSON.parse(currentRaw) : [];
                    const existingIndex = currentArr.findIndex((i: any) => i.id === originalItem.id);
                    if (existingIndex >= 0) {
                        currentArr[existingIndex] = originalItem;
                    } else {
                        currentArr.unshift(originalItem);
                    }
                    localStorage.setItem(localKey, JSON.stringify(currentArr));
                } catch (_) {}
                return normalizeRowFromDB(tableName, originalItem) as T;
            }

            const recovered = await handleAuthError(error);
            if (recovered) {
                const retryResult: any = await withTimeout(supabase.from(tableName).insert(payload).select().single() as any);
                if (retryResult.data) return normalizeRowFromDB(tableName, { ...originalItem, ...retryResult.data }) as T;
            }
            console.error(`Error adding to ${storeName}:`, error);
            throw error;
        }

        return normalizeRowFromDB(tableName, { ...originalItem, ...data }) as T;
    } catch (e) {
        if (await handleAuthError(e)) {
            return add(storeName, item);
        }
        throw e;
    }
};

const update = async <T extends { id: string }>(storeName: string, item: T): Promise<T> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    try {
        const { companyId } = await getCurrentUserAndCompany();
        if (!companyId) throw new Error("User not authenticated");

        const originalItem = { ...item } as any;
        const id = originalItem.id;
        let payload = preparePayload(tableName, originalItem, undefined, companyId);
        delete payload.user_id;

        let result: any = await withTimeout(
            supabase.from(tableName).update(payload).eq('id', id).eq('company_id', companyId).select().single() as any
        );

        let retryCount = 0;
        while (result?.error && isSchemaError(result.error) && retryCount < 15) {
            retryCount++;
            console.warn(`Schema error detected when updating ${storeName}:`, result.error.message);
            const missingCol = extractMissingColumn(result.error);
            if (missingCol && missingCol in payload) {
                console.warn(`Removing missing column '${missingCol}' from update payload and retrying...`);
                delete payload[missingCol];
            } else {
                const optionalCols = [
                    'createdAt', 'purchaseOrderId', 'showDimensions', 'calculationMode', 
                    'isGrouped', 'deliveryNoteIds', 'groupingMode', 'discountType', 
                    'discountValue', 'transport', 'expectedDate', 'expiryDate', 
                    'dueDate', 'subject', 'paymentMethod', 'checkNumber', 'bankName', 
                    'purchaseOrderNumber', 'notes'
                ];
                let strippedAny = false;
                for (const col of optionalCols) {
                    if (col in payload) {
                        delete payload[col];
                        strippedAny = true;
                        break;
                    }
                }
                if (!strippedAny) break;
            }

            result = await withTimeout(
                supabase.from(tableName).update(payload).eq('id', id).eq('company_id', companyId).select().single() as any
            );
        }

        const { data, error } = result;

        if (error) {
            if (error.code === 'PGRST205' || error.code === '42P01' || (error.message && (error.message.includes('table') || error.message.includes('schema cache')) && error.message.includes('does not exist'))) {
                console.warn(`Table '${tableName}' missing in Supabase schema cache, updating item locally:`, originalItem);
                const localKey = `facturago_local_${tableName}`;
                try {
                    const currentRaw = localStorage.getItem(localKey);
                    const currentArr = currentRaw ? JSON.parse(currentRaw) : [];
                    const idx = currentArr.findIndex((i: any) => i.id === originalItem.id);
                    if (idx >= 0) currentArr[idx] = originalItem;
                    else currentArr.unshift(originalItem);
                    localStorage.setItem(localKey, JSON.stringify(currentArr));
                } catch (_) {}
                return normalizeRowFromDB(tableName, originalItem) as T;
            }

            const recovered = await handleAuthError(error);
            if (recovered) {
                const retryResult: any = await withTimeout(supabase.from(tableName).update(payload).eq('id', id).eq('company_id', companyId).select().single() as any);
                if (retryResult.data) return normalizeRowFromDB(tableName, { ...originalItem, ...retryResult.data }) as T;
            }
            console.error(`Error updating ${storeName}:`, error);
            throw error;
        }

        return normalizeRowFromDB(tableName, { ...originalItem, ...data }) as T;
    } catch (e) {
        if (await handleAuthError(e)) {
            return update(storeName, item);
        }
        throw e;
    }
};

const remove = async (storeName: string, id: string | string[], columnName: string = 'id'): Promise<void> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    try {
        const { companyId } = await getCurrentUserAndCompany();
        if (!companyId) throw new Error("User not authenticated");

        if (Array.isArray(id)) {
            if (id.length === 0) return;
            // Chunk IDs to avoid URL length limits (approx 20 per chunk is very safe)
            const chunkSize = 20;
            for (let i = 0; i < id.length; i += chunkSize) {
                const chunk = id.slice(i, i + chunkSize);
                const { error } = await supabase
                    .from(tableName)
                    .delete()
                    .in(columnName, chunk)
                    .eq('company_id', companyId);
                
                if (error) {
                    console.error(`Error deleting chunk from ${storeName} by ${columnName}:`, error);
                    throw error;
                }
            }
            return;
        } else {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq(columnName, id)
                .eq('company_id', companyId);
            
            if (error) throw error;
        }
    } catch (e: any) {
        if (e?.code === 'PGRST205' || e?.code === '42P01' || (e?.message && (e.message.includes('table') || e.message.includes('schema cache')) && e.message.includes('does not exist'))) {
            console.warn(`Table '${tableName}' missing in Supabase schema cache, deleting item locally:`, id);
            const localKey = `facturago_local_${tableName}`;
            try {
                const currentRaw = localStorage.getItem(localKey);
                if (currentRaw) {
                    const ids = Array.isArray(id) ? id : [id];
                    const currentArr = JSON.parse(currentRaw);
                    const filtered = currentArr.filter((i: any) => !ids.includes(i.id));
                    localStorage.setItem(localKey, JSON.stringify(filtered));
                }
            } catch (_) {}
            return;
        }

        if (await handleAuthError(e)) {
            return remove(storeName, id, columnName);
        }
        throw e;
    }
};

const clearAllData = async (): Promise<void> => {
    const tables = Object.values(TABLE_MAP);
    for (const table of tables) {
        if (table === 'settings') continue; 
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
    }
};

const bulkAdd = async <T>(storeName: string, items: T[]): Promise<T[]> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName || items.length === 0) return [];

    try {
        const { userId, companyId } = await getCurrentUserAndCompany();
        if (!userId || !companyId) throw new Error("User not authenticated");

        const itemsWithUser = items.map(item => preparePayload(tableName, item, userId, companyId));
        const allSavedItems: T[] = [];

        // Chunking for bulk insert
        const chunkSize = 200;
        for (let i = 0; i < itemsWithUser.length; i += chunkSize) {
            let chunk = itemsWithUser.slice(i, i + chunkSize);
            let { data, error } = await supabase
                .from(tableName)
                .insert(chunk)
                .select();

            if (error && isSchemaError(error)) {
                console.warn(`Schema error detected in bulkAdd for ${storeName}:`, error.message);
                const missingCol = extractMissingColumn(error);
                chunk = chunk.map((row: any) => {
                    const r = { ...row };
                    if (missingCol) delete r[missingCol];
                    return r;
                });
                const retryRes = await supabase.from(tableName).insert(chunk).select();
                data = retryRes.data;
                error = retryRes.error;
            }

            if (error) {
                console.error(`Error bulk adding chunk to ${storeName}:`, error);
                const recovered = await handleAuthError(error);
                if (recovered) {
                    const { data: retryData, error: retryError } = await supabase.from(tableName).insert(chunk).select();
                    if (retryError) throw retryError;
                    if (retryData) {
                        const normalizedChunk = (retryData as any[]).map(row => normalizeRowFromDB(tableName, row));
                        allSavedItems.push(...(normalizedChunk as T[]));
                    }
                    continue;
                }
                throw error;
            }
            
            if (data) {
                const normalizedChunk = (data as any[]).map(row => normalizeRowFromDB(tableName, row));
                allSavedItems.push(...(normalizedChunk as T[]));
            }
        }
        
        return allSavedItems;
    } catch (e) {
        if (await handleAuthError(e)) {
            return bulkAdd(storeName, items);
        }
        throw e;
    }
};

const bulkUpdate = async <T extends { id: string }>(storeName: string, items: T[]): Promise<T[]> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName || items.length === 0) return [];

    try {
        const { companyId } = await getCurrentUserAndCompany();
        if (!companyId) throw new Error("User not authenticated");

        const allSavedItems: T[] = [];
        const chunkSize = 50; 
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            
            let cleanedChunk = chunk.map(item => {
                const payload = preparePayload(tableName, item, undefined, companyId);
                delete payload.user_id;
                return payload;
            });

            let { data, error } = await supabase
                .from(tableName)
                .upsert(cleanedChunk)
                .select();

            if (error && isSchemaError(error)) {
                console.warn(`Schema error detected in bulkUpdate for ${storeName}:`, error.message);
                const missingCol = extractMissingColumn(error);
                cleanedChunk = cleanedChunk.map((row: any) => {
                    const r = { ...row };
                    if (missingCol) delete r[missingCol];
                    return r;
                });
                const retryRes = await supabase.from(tableName).upsert(cleanedChunk).select();
                data = retryRes.data;
                error = retryRes.error;
            }

            if (error) {
                console.error(`Error bulk updating chunk in ${storeName}:`, error);
                throw error;
            }
            if (data) {
                const normalizedChunk = (data as any[]).map(row => normalizeRowFromDB(tableName, row));
                allSavedItems.push(...(normalizedChunk as any[]));
            }
        }
        return allSavedItems as any;
    } catch (e) {
        if (await handleAuthError(e)) {
            return bulkUpdate(storeName, items);
        }
        throw e;
    }
};

export const dbService = {
    clients: {
        getAll: () => getAll<Client>('clients'),
        add: (item: Client) => add<Client>('clients', item),
        update: (item: Client) => update<Client>('clients', item),
        delete: (id: string | string[]) => remove('clients', id),
    },
    products: {
        getAll: () => getAll<Product>('products'),
        getById: async (id: string) => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as Product;
        },
        add: (item: Product) => add<Product>('products', item),
        update: (item: Product) => update<Product>('products', item),
        delete: (id: string | string[]) => remove('products', id),
    },
    suppliers: {
        getAll: () => getAll<Supplier>('suppliers'),
        add: (item: Supplier) => add<Supplier>('suppliers', item),
        update: (item: Supplier) => update<Supplier>('suppliers', item),
        delete: (id: string | string[]) => remove('suppliers', id),
    },
    quotes: {
        getAll: () => getAll<Quote>('quotes'),
        add: (item: Quote) => add<Quote>('quotes', item),
        update: (item: Quote) => update<Quote>('quotes', item),
        bulkUpdate: (items: Quote[]) => bulkUpdate<Quote>('quotes', items),
        delete: (id: string | string[]) => remove('quotes', id),
    },
    purchaseOrders: {
        getAll: () => getAll<PurchaseOrder>('purchase_orders'),
        add: (item: PurchaseOrder) => add<PurchaseOrder>('purchase_orders', item),
        update: (item: PurchaseOrder) => update<PurchaseOrder>('purchase_orders', item),
        bulkUpdate: (items: PurchaseOrder[]) => bulkUpdate<PurchaseOrder>('purchase_orders', items),
        delete: (id: string | string[]) => remove('purchase_orders', id),
    },
    invoices: {
        getAll: () => getAll<Invoice>('invoices'),
        add: (item: Invoice) => add<Invoice>('invoices', item),
        update: (item: Invoice) => update<Invoice>('invoices', item),
        bulkUpdate: (items: Invoice[]) => bulkUpdate<Invoice>('invoices', items),
        delete: (id: string | string[]) => remove('invoices', id),
    },
    creditNotes: {
        getAll: () => getAll<CreditNote>('credit_notes'),
        add: (item: CreditNote) => add<CreditNote>('credit_notes', item),
        update: (item: CreditNote) => update<CreditNote>('credit_notes', item),
        bulkUpdate: (items: CreditNote[]) => bulkUpdate<CreditNote>('credit_notes', items),
        delete: (id: string | string[]) => remove('credit_notes', id),
    },
    payments: {
        getAll: () => getAll<Payment>('payments'),
        add: (item: Payment) => add<Payment>('payments', item),
        update: (item: Payment) => update<Payment>('payments', item),
        bulkUpdate: (items: Payment[]) => bulkUpdate<Payment>('payments', items),
        delete: (id: string | string[]) => remove('payments', id),
    },
    deliveryNotes: {
        getAll: () => getAll<DeliveryNote>('delivery_notes'),
        add: (item: DeliveryNote) => add<DeliveryNote>('delivery_notes', item),
        update: (item: DeliveryNote) => update<DeliveryNote>('delivery_notes', item),
        bulkUpdate: (items: DeliveryNote[]) => bulkUpdate<DeliveryNote>('delivery_notes', items),
        delete: (id: string | string[]) => remove('delivery_notes', id),
    },
    stockMovements: {
        getAll: () => getAll<StockMovement>('stock_movements'),
        add: (item: StockMovement) => add<StockMovement>('stock_movements', item),
        delete: (id: string | string[]) => remove('stock_movements', id),
        deleteByProduct: (productId: string | string[]) => remove('stock_movements', productId, 'productId'),
    },
    expenses: {
        getAll: () => getAll<Expense>('expenses'),
        add: (item: Expense) => add<Expense>('expenses', item),
        update: (item: Expense) => update<Expense>('expenses', item),
        delete: (id: string | string[]) => remove('expenses', id),
    },
    employees: {
        getAll: () => getAll<Employee>('employees'),
        add: (item: Employee) => add<Employee>('employees', item),
        update: (item: Employee) => update<Employee>('employees', item),
        delete: (id: string | string[]) => remove('employees', id),
    },
    attendances: {
        getAll: () => getAll<Attendance>('attendances'),
        add: (item: Attendance) => add<Attendance>('attendances', item),
        update: (item: Attendance) => update<Attendance>('attendances', item),
        delete: (id: string | string[]) => remove('attendances', id),
    },
    salaryPayments: {
        getAll: () => getAll<SalaryPayment>('salary_payments'),
        add: (item: SalaryPayment) => add<SalaryPayment>('salary_payments', item),
        update: (item: SalaryPayment) => update<SalaryPayment>('salary_payments', item),
        delete: (id: string | string[]) => remove('salary_payments', id),
    },
    returns: {
        getAll: () => getAll<WarrantyReturn>('returns'),
        add: (item: WarrantyReturn) => add<WarrantyReturn>('returns', item),
        update: (item: WarrantyReturn) => update<WarrantyReturn>('returns', item),
        delete: (id: string | string[]) => remove('returns', id),
    },
    settings: {
        get: async (): Promise<CompanySettings | null> => {
            const getCachedFallback = (): CompanySettings => {
                try {
                    const raw = localStorage.getItem('facturago_company_settings');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object') return parsed;
                    }
                } catch (_) {}

                return {
                    id: 'local_cached',
                    companyName: localStorage.getItem('facturago_company_name') || '',
                    address: localStorage.getItem('facturago_company_address') || '',
                    phone: localStorage.getItem('facturago_company_phone') || '',
                    email: localStorage.getItem('facturago_company_email') || '',
                    website: localStorage.getItem('facturago_company_website') || '',
                    ice: localStorage.getItem('facturago_company_ice') || '',
                    rc: localStorage.getItem('facturago_company_rc') || '',
                    fiscalId: localStorage.getItem('facturago_company_if') || '',
                    patente: localStorage.getItem('facturago_company_patente') || '',
                    cnss: localStorage.getItem('facturago_company_cnss') || '',
                    capital: localStorage.getItem('facturago_company_capital') || '',
                    primaryColor: '#10b981',
                    showAmountInWords: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_AMOUNT_IN_WORDS) !== 'false',
                    documentInfoPosition: (localStorage.getItem(LOCAL_STORAGE_KEYS.DOCUMENT_INFO_POSITION) as any) || 'right',
                    showExpiryDate: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_EXPIRY_DATE) !== 'false',
                    logoWidth: parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.LOGO_WIDTH) || '200', 10),
                    backgroundLogo: localStorage.getItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO) || undefined,
                    backgroundLogoWidth: parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO_WIDTH) || '450', 10),
                    stampWidth: parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.STAMP_WIDTH) || '220', 10),
                    showLogoWatermark: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_LOGO_WATERMARK) !== 'false',
                    logoWatermarkOpacity: parseFloat(localStorage.getItem(LOCAL_STORAGE_KEYS.LOGO_WATERMARK_OPACITY) || '0.07'),
                    headerTextColor: localStorage.getItem(LOCAL_STORAGE_KEYS.HEADER_TEXT_COLOR) || '#ffffff',
                    tableHeaderBgColor: localStorage.getItem(LOCAL_STORAGE_KEYS.TABLE_HEADER_BG_COLOR) || '#10b981',
                    showTableBorders: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_TABLE_BORDERS) !== 'false',
                    clientPosition: (localStorage.getItem(LOCAL_STORAGE_KEYS.CLIENT_POSITION) as any) || 'right',
                    defaultCurrencyCode: localStorage.getItem(LOCAL_STORAGE_KEYS.DEFAULT_CURRENCY_CODE) || 'MAD',
                    defaultTva: parseFloat(localStorage.getItem(LOCAL_STORAGE_KEYS.DEFAULT_TVA) || '20'),
                    showVatSummaryTable: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_VAT_SUMMARY_TABLE) !== 'false',
                    showTransport: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_TRANSPORT) === 'true',
                    showTotalGlobal: localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_TOTAL_GLOBAL) === 'true'
                } as CompanySettings;
            };

            try {
                const { companyId } = await getCurrentUserAndCompany();
                if (!companyId) return getCachedFallback();

                const result: any = await withTimeout(
                    Promise.resolve(
                        supabase
                            .from('settings')
                            .select('*')
                            .eq('company_id', companyId)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle()
                    ),
                    12000
                ).catch((err: any) => ({ data: null, error: err }));

                const { data, error } = result || {};
                
                if (error) {
                    if (await handleAuthError(error)) {
                        return dbService.settings.get();
                    }
                    console.warn("Notice fetching settings, using cached fallback:", error?.message || error);
                    return getCachedFallback();
                }

                const settings = data as any;
                if (settings) {
                    if (settings.company_name && !settings.companyName) settings.companyName = settings.company_name;
                    if (settings.fiscal_id && !settings.fiscalId) settings.fiscalId = settings.fiscal_id;
                    if (settings.primary_color && !settings.primaryColor) settings.primaryColor = settings.primary_color;
                    if (settings.footer_notes && !settings.footerNotes) settings.footerNotes = settings.footer_notes;
                    if (settings.default_payment_terms && !settings.defaultPaymentTerms) settings.defaultPaymentTerms = settings.default_payment_terms;
                    if (settings.document_columns && !settings.documentColumns) settings.documentColumns = settings.document_columns;
                    if (settings.invoice_numbering && !settings.invoiceNumbering) settings.invoiceNumbering = settings.invoice_numbering;
                    if (settings.quote_numbering && !settings.quoteNumbering) settings.quoteNumbering = settings.quote_numbering;
                    if (settings.delivery_note_numbering && !settings.deliveryNoteNumbering) settings.deliveryNoteNumbering = settings.delivery_note_numbering;
                    if (settings.purchase_order_numbering && !settings.purchaseOrderNumbering) settings.purchaseOrderNumbering = settings.purchase_order_numbering;
                    if (settings.credit_note_numbering && !settings.creditNoteNumbering) settings.creditNoteNumbering = settings.credit_note_numbering;
                    if (settings.price_display_mode && !settings.priceDisplayMode) settings.priceDisplayMode = settings.price_display_mode;
                    if (settings.background_logo && !settings.backgroundLogo) settings.backgroundLogo = settings.background_logo;
                    if (settings.header_text_color && !settings.headerTextColor) settings.headerTextColor = settings.header_text_color;
                    if (settings.table_header_bg_color && !settings.tableHeaderBgColor) settings.tableHeaderBgColor = settings.table_header_bg_color;
                    if (settings.logo_width !== undefined && settings.logoWidth === undefined) settings.logoWidth = settings.logo_width;
                    if (settings.background_logo_width !== undefined && settings.backgroundLogoWidth === undefined) settings.backgroundLogoWidth = settings.background_logo_width;
                    if (settings.show_logo_watermark !== undefined && settings.showLogoWatermark === undefined) settings.showLogoWatermark = settings.show_logo_watermark;
                    if (settings.logo_watermark_opacity !== undefined && settings.logoWatermarkOpacity === undefined) settings.logoWatermarkOpacity = settings.logo_watermark_opacity;
                    if (settings.stamp_width !== undefined && settings.stampWidth === undefined) settings.stampWidth = settings.stamp_width;
                    if (settings.show_table_borders !== undefined && settings.showTableBorders === undefined) settings.showTableBorders = settings.show_table_borders;
                    if (settings.client_position && !settings.clientPosition) settings.clientPosition = settings.client_position;
                    if (settings.default_currency_code && !settings.defaultCurrencyCode) settings.defaultCurrencyCode = settings.default_currency_code;
                    if (settings.show_amount_in_words !== undefined && settings.showAmountInWords === undefined) settings.showAmountInWords = settings.show_amount_in_words;
                    if (settings.show_signature_recipient !== undefined && settings.showSignatureRecipient === undefined) settings.showSignatureRecipient = settings.show_signature_recipient;
                    if (settings.document_info_position && !settings.documentInfoPosition) settings.documentInfoPosition = settings.document_info_position;
                    if (settings.show_expiry_date !== undefined && settings.showExpiryDate === undefined) settings.showExpiryDate = settings.show_expiry_date;
                    if (settings.show_unit_in_pdf !== undefined && settings.showUnitInPDF === undefined) settings.showUnitInPDF = settings.show_unit_in_pdf;
                    if (settings.default_tva !== undefined && settings.defaultTva === undefined) settings.defaultTva = settings.default_tva;
                    if (settings.show_vat_summary_table !== undefined && settings.showVatSummaryTable === undefined) settings.showVatSummaryTable = settings.show_vat_summary_table;
                    if (settings.show_transport !== undefined && settings.showTransport === undefined) settings.showTransport = settings.show_transport;
                    if (settings.show_total_global !== undefined && settings.showTotalGlobal === undefined) settings.showTotalGlobal = settings.show_total_global;
                    if (settings.default_thermal_ticket_width && !settings.defaultThermalTicketWidth) settings.defaultThermalTicketWidth = settings.default_thermal_ticket_width;

                    let docLabels = settings.document_labels || settings.documentLabels;
                    if (typeof docLabels === 'string') {
                        try {
                            docLabels = JSON.parse(docLabels);
                        } catch (e) {
                            console.error("Error parsing documentLabels:", e);
                            docLabels = {};
                        }
                    }
                    settings.documentLabels = docLabels || {};
                    try {
                        const dbCustom = (settings.documentLabels as any)?._customSettings || {};

                        // Prioritize database settings from dbCustom over local browser cache
                        if (dbCustom.showAmountInWords !== undefined) {
                            settings.showAmountInWords = dbCustom.showAmountInWords;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_AMOUNT_IN_WORDS);
                            settings.showAmountInWords = local !== null ? local === 'true' : (settings.showAmountInWords ?? true);
                        }

                        if (dbCustom.documentInfoPosition !== undefined) {
                            settings.documentInfoPosition = dbCustom.documentInfoPosition;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.DOCUMENT_INFO_POSITION);
                            settings.documentInfoPosition = (local as any) || settings.documentInfoPosition || 'right';
                        }

                        if (dbCustom.showExpiryDate !== undefined) {
                            settings.showExpiryDate = dbCustom.showExpiryDate;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_EXPIRY_DATE);
                            settings.showExpiryDate = local !== null ? local === 'true' : (settings.showExpiryDate ?? true);
                        }

                        if (dbCustom.logoWidth !== undefined) {
                            settings.logoWidth = dbCustom.logoWidth;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGO_WIDTH);
                            settings.logoWidth = local !== null ? parseInt(local, 10) : (settings.logoWidth || 200);
                        }

                        if (dbCustom.backgroundLogo !== undefined) {
                            settings.backgroundLogo = dbCustom.backgroundLogo;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO);
                            if (local) settings.backgroundLogo = local;
                        }

                        if (dbCustom.backgroundLogoWidth !== undefined) {
                            settings.backgroundLogoWidth = dbCustom.backgroundLogoWidth;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO_WIDTH);
                            settings.backgroundLogoWidth = local !== null ? parseInt(local, 10) : (settings.backgroundLogoWidth || 450);
                        }

                        if (dbCustom.stampWidth !== undefined) {
                            settings.stampWidth = dbCustom.stampWidth;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.STAMP_WIDTH);
                            settings.stampWidth = local !== null ? parseInt(local, 10) : (settings.stampWidth || 220);
                        }

                        if (dbCustom.showLogoWatermark !== undefined) {
                            settings.showLogoWatermark = dbCustom.showLogoWatermark;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_LOGO_WATERMARK);
                            settings.showLogoWatermark = local !== null ? local === 'true' : (settings.showLogoWatermark ?? true);
                        }

                        if (dbCustom.logoWatermarkOpacity !== undefined) {
                            settings.logoWatermarkOpacity = dbCustom.logoWatermarkOpacity;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGO_WATERMARK_OPACITY);
                            settings.logoWatermarkOpacity = local !== null ? parseFloat(local) : (settings.logoWatermarkOpacity ?? 0.07);
                        }

                        if (dbCustom.headerTextColor !== undefined) {
                            settings.headerTextColor = dbCustom.headerTextColor;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.HEADER_TEXT_COLOR);
                            settings.headerTextColor = local || settings.headerTextColor || '#ffffff';
                        }

                        if (dbCustom.tableHeaderBgColor !== undefined) {
                            settings.tableHeaderBgColor = dbCustom.tableHeaderBgColor;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.TABLE_HEADER_BG_COLOR);
                            settings.tableHeaderBgColor = local || settings.tableHeaderBgColor || settings.primaryColor || '#10b981';
                        }

                        if (dbCustom.showTableBorders !== undefined) {
                            settings.showTableBorders = dbCustom.showTableBorders;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_TABLE_BORDERS);
                            settings.showTableBorders = local !== null ? local === 'true' : (settings.showTableBorders ?? true);
                        }

                        if (dbCustom.clientPosition !== undefined) {
                            settings.clientPosition = dbCustom.clientPosition;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.CLIENT_POSITION);
                            settings.clientPosition = (local as any) || settings.clientPosition || 'right';
                        }

                        if (dbCustom.defaultCurrencyCode !== undefined) {
                            settings.defaultCurrencyCode = dbCustom.defaultCurrencyCode;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.DEFAULT_CURRENCY_CODE);
                            settings.defaultCurrencyCode = local || settings.defaultCurrencyCode || 'MAD';
                        }

                        if (dbCustom.defaultTva !== undefined) {
                            settings.defaultTva = dbCustom.defaultTva;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.DEFAULT_TVA);
                            settings.defaultTva = local !== null ? parseFloat(local) : (settings.defaultTva ?? 20);
                        }

                        if (dbCustom.showVatSummaryTable !== undefined) {
                            settings.showVatSummaryTable = dbCustom.showVatSummaryTable;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_VAT_SUMMARY_TABLE);
                            settings.showVatSummaryTable = local !== null ? local === 'true' : (settings.showVatSummaryTable ?? true);
                        }

                        if (dbCustom.showTransport !== undefined) {
                            settings.showTransport = dbCustom.showTransport;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_TRANSPORT);
                            settings.showTransport = local !== null ? local === 'true' : false;
                        }

                        if (dbCustom.showTotalGlobal !== undefined) {
                            settings.showTotalGlobal = dbCustom.showTotalGlobal;
                        } else {
                            const local = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_TOTAL_GLOBAL);
                            settings.showTotalGlobal = local !== null ? local === 'true' : false;
                        }

                        if (dbCustom.showSignatureRecipient !== undefined) {
                            settings.showSignatureRecipient = dbCustom.showSignatureRecipient;
                        }
                        if (dbCustom.showUnitInPDF !== undefined) {
                            settings.showUnitInPDF = dbCustom.showUnitInPDF;
                        }

                        try {
                            safeSetItem('facturago_company_settings', JSON.stringify(settings));
                            safeSetItem(LOCAL_STORAGE_KEYS.SHOW_AMOUNT_IN_WORDS, String(settings.showAmountInWords));
                            safeSetItem(LOCAL_STORAGE_KEYS.DOCUMENT_INFO_POSITION, settings.documentInfoPosition || 'right');
                            safeSetItem(LOCAL_STORAGE_KEYS.SHOW_EXPIRY_DATE, String(settings.showExpiryDate));
                            safeSetItem(LOCAL_STORAGE_KEYS.LOGO_WIDTH, String(settings.logoWidth));
                            if (settings.backgroundLogo) {
                                safeSetItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO, settings.backgroundLogo);
                            } else {
                                safeRemoveItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO);
                            }
                            if (settings.backgroundLogoWidth) {
                                safeSetItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO_WIDTH, String(settings.backgroundLogoWidth));
                            }
                            safeSetItem(LOCAL_STORAGE_KEYS.STAMP_WIDTH, String(settings.stampWidth));
                            safeSetItem(LOCAL_STORAGE_KEYS.SHOW_LOGO_WATERMARK, String(settings.showLogoWatermark));
                            safeSetItem(LOCAL_STORAGE_KEYS.LOGO_WATERMARK_OPACITY, String(settings.logoWatermarkOpacity));
                            safeSetItem(LOCAL_STORAGE_KEYS.HEADER_TEXT_COLOR, settings.headerTextColor || '#ffffff');
                            safeSetItem(LOCAL_STORAGE_KEYS.TABLE_HEADER_BG_COLOR, settings.tableHeaderBgColor || '#10b981');
                            safeSetItem(LOCAL_STORAGE_KEYS.SHOW_TABLE_BORDERS, String(settings.showTableBorders));
                            safeSetItem(LOCAL_STORAGE_KEYS.CLIENT_POSITION, settings.clientPosition || 'right');
                            safeSetItem(LOCAL_STORAGE_KEYS.DEFAULT_CURRENCY_CODE, settings.defaultCurrencyCode || 'MAD');
                            safeSetItem(LOCAL_STORAGE_KEYS.DEFAULT_TVA, String(settings.defaultTva ?? 20));
                            safeSetItem(LOCAL_STORAGE_KEYS.SHOW_VAT_SUMMARY_TABLE, String(settings.showVatSummaryTable !== false));
                            safeSetItem(LOCAL_STORAGE_KEYS.SHOW_TRANSPORT, String(settings.showTransport));
                            safeSetItem(LOCAL_STORAGE_KEYS.SHOW_TOTAL_GLOBAL, String(settings.showTotalGlobal));
                        } catch (storageErr) {
                            console.error("Failed to write loaded settings to localStorage", storageErr);
                        }
                    } catch (e) {
                        console.error("Error parsing settings options:", e);
                    }
                    return settings;
                }
                return getCachedFallback();
            } catch (e: any) {
                if (await handleAuthError(e)) {
                    return dbService.settings.get();
                }
                console.warn("Settings fetch fallback to local cache:", e?.message || e);
                return getCachedFallback();
            }
        },
        update: async (settings: CompanySettings): Promise<CompanySettings> => {
            // Save to localStorage with safety immediately
            try {
                safeSetItem('facturago_company_settings', JSON.stringify(settings));
                if (settings.companyName) safeSetItem('facturago_company_name', settings.companyName);
                if (settings.address) safeSetItem('facturago_company_address', settings.address);
                if (settings.phone) safeSetItem('facturago_company_phone', settings.phone);
                if (settings.email) safeSetItem('facturago_company_email', settings.email);
                if (settings.website) safeSetItem('facturago_company_website', settings.website);
                if (settings.ice) safeSetItem('facturago_company_ice', settings.ice);
                if (settings.rc) safeSetItem('facturago_company_rc', settings.rc);
                if (settings.fiscalId) safeSetItem('facturago_company_if', settings.fiscalId);
                if (settings.patente) safeSetItem('facturago_company_patente', settings.patente);
                if (settings.cnss) safeSetItem('facturago_company_cnss', settings.cnss);
                if (settings.capital) safeSetItem('facturago_company_capital', settings.capital);

                if (settings.showAmountInWords !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.SHOW_AMOUNT_IN_WORDS, String(settings.showAmountInWords));
                }

                if (settings.documentInfoPosition !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.DOCUMENT_INFO_POSITION, settings.documentInfoPosition);
                }

                if (settings.showExpiryDate !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.SHOW_EXPIRY_DATE, String(settings.showExpiryDate));
                }

                if (settings.logoWidth !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.LOGO_WIDTH, String(settings.logoWidth));
                 }

                if (settings.backgroundLogo !== undefined) {
                    if (settings.backgroundLogo) {
                        safeSetItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO, settings.backgroundLogo);
                    } else {
                        safeRemoveItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO);
                    }
                }

                if (settings.backgroundLogoWidth !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.BACKGROUND_LOGO_WIDTH, String(settings.backgroundLogoWidth));
                }

                if (settings.stampWidth !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.STAMP_WIDTH, String(settings.stampWidth));
                 }

                if (settings.showLogoWatermark !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.SHOW_LOGO_WATERMARK, String(settings.showLogoWatermark));
                }

                if (settings.logoWatermarkOpacity !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.LOGO_WATERMARK_OPACITY, String(settings.logoWatermarkOpacity));
                }

                if (settings.headerTextColor !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.HEADER_TEXT_COLOR, settings.headerTextColor);
                }

                if (settings.tableHeaderBgColor !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.TABLE_HEADER_BG_COLOR, settings.tableHeaderBgColor);
                }

                if (settings.showTableBorders !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.SHOW_TABLE_BORDERS, String(settings.showTableBorders));
                }

                if (settings.clientPosition !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.CLIENT_POSITION, settings.clientPosition);
                }
                if (settings.defaultCurrencyCode !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.DEFAULT_CURRENCY_CODE, settings.defaultCurrencyCode);
                }
                if (settings.defaultTva !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.DEFAULT_TVA, String(settings.defaultTva));
                }
                if (settings.showVatSummaryTable !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.SHOW_VAT_SUMMARY_TABLE, String(settings.showVatSummaryTable));
                }
                if (settings.showTransport !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.SHOW_TRANSPORT, String(settings.showTransport));
                }
                if (settings.showTotalGlobal !== undefined) {
                    safeSetItem(LOCAL_STORAGE_KEYS.SHOW_TOTAL_GLOBAL, String(settings.showTotalGlobal));
                }
            } catch (e) {
                console.error("Error saving to localStorage in db.ts:", e);
            }

            try {
                const { userId, companyId } = await getCurrentUserAndCompany();
                if (!userId || !companyId) return settings;

                // Save to documentLabels._customSettings to persist in database!
                if (!settings.documentLabels) {
                    settings.documentLabels = {};
                }
                const customSettings = {
                    showAmountInWords: settings.showAmountInWords,
                    documentInfoPosition: settings.documentInfoPosition,
                    showExpiryDate: settings.showExpiryDate,
                    logoWidth: settings.logoWidth,
                    backgroundLogo: settings.backgroundLogo,
                    backgroundLogoWidth: settings.backgroundLogoWidth,
                    stampWidth: settings.stampWidth,
                    showLogoWatermark: settings.showLogoWatermark,
                    logoWatermarkOpacity: settings.logoWatermarkOpacity,
                    headerTextColor: settings.headerTextColor,
                    tableHeaderBgColor: settings.tableHeaderBgColor,
                    showTableBorders: settings.showTableBorders,
                    clientPosition: settings.clientPosition,
                    defaultCurrencyCode: settings.defaultCurrencyCode,
                    defaultTva: settings.defaultTva,
                    showVatSummaryTable: settings.showVatSummaryTable,
                    showTransport: settings.showTransport,
                    showTotalGlobal: settings.showTotalGlobal,
                    showSignatureRecipient: settings.showSignatureRecipient,
                    showUnitInPDF: settings.showUnitInPDF
                };
                (settings.documentLabels as any)._customSettings = customSettings;
                
                const { data: existingRow, error: fetchError } = await supabase
                    .from('settings')
                    .select('id')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (fetchError) {
                    if (await handleAuthError(fetchError)) {
                        return dbService.settings.update(settings);
                    }
                    console.warn("Notice checking settings row:", fetchError.message);
                }

                // Filter cleanData strictly to columns present in the Supabase settings table
                const cleanData: Record<string, any> = {};
                for (const key of Object.keys(settings)) {
                    if (SETTINGS_DB_COLUMNS.has(key)) {
                        cleanData[key] = (settings as any)[key];
                    }
                }
                cleanData.documentLabels = settings.documentLabels;
                if (settings.documentLabels) {
                    cleanData.document_labels = settings.documentLabels;
                }
                if (settings.backgroundLogo) {
                    cleanData.backgroundLogo = settings.backgroundLogo;
                    cleanData.background_logo = settings.backgroundLogo;
                }

                let resultData, resultError;

                if (existingRow && existingRow.id) {
                    const response = await supabase
                        .from('settings')
                        .update(cleanData) 
                        .eq('id', existingRow.id)
                        .select()
                        .single();
                    resultData = response.data;
                    resultError = response.error;
                } else {
                    const payload = { ...cleanData, user_id: userId, company_id: companyId };
                    const response = await supabase
                        .from('settings')
                        .insert(payload)
                        .select()
                        .single();
                    resultData = response.data;
                    resultError = response.error;
                }

                // Retry loop for schema errors (auto-strips missing column if any)
                let retryCount = 0;
                while (resultError && isSchemaError(resultError) && retryCount < 10) {
                    retryCount++;
                    console.warn("Schema error updating settings:", resultError.message);
                    const missingCol = extractMissingColumn(resultError);
                    if (missingCol && missingCol in cleanData) {
                        delete cleanData[missingCol];
                        if (existingRow && existingRow.id) {
                            const res = await supabase.from('settings').update(cleanData).eq('id', existingRow.id).select().single();
                            resultData = res.data;
                            resultError = res.error;
                        } else {
                            const res = await supabase.from('settings').insert({ ...cleanData, user_id: userId, company_id: companyId }).select().single();
                            resultData = res.data;
                            resultError = res.error;
                        }
                    } else {
                        break;
                    }
                }

                if (resultError) {
                    if (await handleAuthError(resultError)) {
                        return dbService.settings.update(settings);
                    }
                    console.error("Supabase Save Error for settings:", resultError);
                    throw new Error(`Erreur d'enregistrement dans la base de données: ${resultError.message}`);
                }

                const finalResultData = (resultData || {}) as any;
                let docLabels = finalResultData.documentLabels || settings.documentLabels || {};
                if (typeof docLabels === 'string') {
                    try {
                        docLabels = JSON.parse(docLabels);
                    } catch (e) {
                        docLabels = {};
                    }
                }

                const finalResult = { 
                    ...settings,
                    ...finalResultData,
                    documentLabels: docLabels,
                    ...customSettings
                };
                return finalResult;
            } catch (err: any) {
                console.error("Settings update error:", err);
                throw err;
            }
        }
    },
    getAllData: async (): Promise<Record<string, any[]>> => {
        const data: Record<string, any[]> = {};
        const tables = Object.keys(TABLE_MAP);
        
        for (const storeName of tables) {
            if (storeName === 'settings') continue;
            data[storeName] = await getAll(storeName);
        }
        return data;
    },
    clearAllData,
    bulkAdd
};
