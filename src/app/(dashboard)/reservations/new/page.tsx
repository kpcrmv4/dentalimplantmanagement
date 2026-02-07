'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Package,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  Info,
  ShoppingCart,
  X,
  FileText,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  Badge,
  Modal,
  ModalFooter,
  ConfirmModal,
} from '@/components/ui';
import { useCases, useProducts, useInventory, useProductSearch, useCategories } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { formatDate, daysUntil, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ProductSearchResult, InventorySearchItem, ProductSpecifications, MaterialTemplate, MaterialTemplateItem } from '@/types/database';
import { triggerOutOfStock } from '@/lib/notification-triggers';

interface CartItem {
  id: string; // unique cart item id
  product_id: string;
  product_name: string;
  product_sku?: string;
  ref_number?: string;
  inventory_id?: string;
  lot_number?: string;
  expiry_date?: string;
  quantity: number;
  available?: number;
  is_out_of_stock: boolean;
  requested_ref?: string;
  requested_lot?: string;
  requested_specs?: ProductSpecifications;
  specifications?: ProductSpecifications;
}

interface TemplateWithScore {
  template: MaterialTemplate;
  score: number;
  inStockCount: number;
  totalCount: number;
  allInStock: boolean;
  cartItems: CartItem[];
  oosItems: CartItem[];
}

export default function NewReservationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseIdParam = searchParams.get('case_id');
  const { user } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(caseIdParam || '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDetail, setShowProductDetail] = useState<ProductSearchResult | null>(null);
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);
  const [outOfStockProduct, setOutOfStockProduct] = useState<ProductSearchResult | null>(null);
  const [outOfStockRef, setOutOfStockRef] = useState('');
  const [outOfStockLot, setOutOfStockLot] = useState('');
  const [outOfStockQty, setOutOfStockQty] = useState(1);

  // Template recommendation state
  const [scoredTemplates, setScoredTemplates] = useState<TemplateWithScore[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [showOosConfirmModal, setShowOosConfirmModal] = useState(false);
  const [pendingTemplateLoad, setPendingTemplateLoad] = useState<TemplateWithScore | null>(null);
  const [showCartReplaceConfirm, setShowCartReplaceConfirm] = useState(false);
  const [pendingCartReplaceTemplate, setPendingCartReplaceTemplate] = useState<TemplateWithScore | null>(null);

  const { data: cases } = useCases();
  const { data: searchResults, isLoading: isSearching } = useProductSearch(searchTerm);

  // Check if user is dentist
  const isDentist = user?.role === 'dentist';

  // Filter cases for this dentist only
  const dentistCases = useMemo(() => {
    if (!cases || !user) return [];
    return cases.filter(
      (c) =>
        c.dentist_id === user.id &&
        !['completed', 'cancelled'].includes(c.status)
    );
  }, [cases, user]);

  const caseOptions = [
    { value: '', label: 'เลือกเคส' },
    ...(dentistCases?.map((c) => ({
      value: c.id,
      label: `${c.case_number} - ${c.patient?.first_name} ${c.patient?.last_name} (${formatDate(c.surgery_date)})`,
    })) || []),
  ];

  // Get selected case details
  const selectedCase = useMemo(() => {
    return cases?.find((c) => c.id === selectedCaseId);
  }, [cases, selectedCaseId]);

  // Calculate days until surgery
  const daysUntilSurgery = useMemo(() => {
    if (!selectedCase) return null;
    return daysUntil(selectedCase.surgery_date);
  }, [selectedCase]);

  // Fetch and score templates when case is selected
  useEffect(() => {
    if (!selectedCase?.procedure_type) {
      setScoredTemplates([]);
      setShowTemplatePanel(false);
      return;
    }

    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        // 1. Find procedure_type id by value
        const { data: ptData } = await supabase
          .from('procedure_types')
          .select('id')
          .eq('value', selectedCase.procedure_type!)
          .eq('is_active', true)
          .single();

        if (!ptData) {
          setScoredTemplates([]);
          setShowTemplatePanel(false);
          return;
        }

        // 2. Fetch templates with items and products
        const { data: templates } = await supabase
          .from('material_templates')
          .select(`
            *,
            items:material_template_items(
              *,
              product:products(id, name, sku, ref_number, brand, is_implant, specifications)
            )
          `)
          .eq('procedure_type_id', ptData.id)
          .eq('is_active', true)
          .order('sort_order');

        if (!templates || templates.length === 0) {
          setScoredTemplates([]);
          setShowTemplatePanel(false);
          return;
        }

        // 3. Score each template
        const scored: TemplateWithScore[] = [];

        for (const template of templates) {
          const items = (template.items || []) as (MaterialTemplateItem & { product: any })[];
          let score = 0;
          let inStockCount = 0;
          const cartItems: CartItem[] = [];
          const oosItems: CartItem[] = [];

          for (const item of items) {
            if (!item.product) continue;

            // Fetch inventory for this product
            const { data: inventory } = await supabase
              .from('inventory')
              .select('id, lot_number, expiry_date, available_quantity')
              .eq('product_id', item.product_id)
              .gt('available_quantity', 0)
              .order('expiry_date', { ascending: true, nullsFirst: false });

            if (inventory && inventory.length > 0) {
              // Pick best LOT: nearest expiry with enough qty, fallback to most stock
              let bestLot = inventory[0]; // FEFO first

              // If FEFO lot doesn't have enough, try most stock
              if (bestLot.available_quantity < item.quantity) {
                const mostStock = [...inventory].sort((a, b) => b.available_quantity - a.available_quantity)[0];
                if (mostStock.available_quantity >= item.quantity) {
                  bestLot = mostStock;
                }
              }

              const daysUntilExp = bestLot.expiry_date
                ? Math.ceil((new Date(bestLot.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              inStockCount++;
              score += 100; // In stock
              if (daysUntilExp !== null && daysUntilExp <= 90) score += 50; // Expiring soon bonus
              if (bestLot.available_quantity >= item.quantity * 2) score += 25; // Plenty of stock

              cartItems.push({
                id: `${item.product_id}-${bestLot.id}`,
                product_id: item.product_id,
                product_name: item.product.name,
                product_sku: item.product.sku,
                ref_number: item.product.ref_number,
                inventory_id: bestLot.id,
                lot_number: bestLot.lot_number,
                expiry_date: bestLot.expiry_date,
                quantity: item.quantity,
                available: bestLot.available_quantity,
                is_out_of_stock: false,
                specifications: item.product.specifications,
              });
            } else {
              // Out of stock
              const oosItem: CartItem = {
                id: `oos-${item.product_id}-${Date.now()}-${Math.random()}`,
                product_id: item.product_id,
                product_name: item.product.name,
                product_sku: item.product.sku,
                ref_number: item.product.ref_number,
                quantity: item.quantity,
                is_out_of_stock: true,
                requested_ref: item.product.ref_number || item.product.sku || '',
                specifications: item.product.specifications,
              };
              oosItems.push(oosItem);
            }
          }

          scored.push({
            template,
            score,
            inStockCount,
            totalCount: items.length,
            allInStock: oosItems.length === 0,
            cartItems,
            oosItems,
          });
        }

        // Sort: highest score first
        scored.sort((a, b) => b.score - a.score);
        setScoredTemplates(scored);
        setShowTemplatePanel(scored.length > 0);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [selectedCase?.procedure_type, selectedCase?.id]);

  // Load template into cart
  const handleSelectTemplate = (scored: TemplateWithScore) => {
    if (cart.length > 0) {
      setPendingCartReplaceTemplate(scored);
      setShowCartReplaceConfirm(true);
      return;
    }
    proceedWithTemplate(scored);
  };

  const proceedWithTemplate = (scored: TemplateWithScore) => {
    if (scored.oosItems.length > 0) {
      // Has OOS items - show confirmation
      setPendingTemplateLoad(scored);
      setShowOosConfirmModal(true);
    } else {
      // All in stock - load directly
      setCart(scored.cartItems);
      toast.success(`โหลดเทมเพลท "${scored.template.name}" เรียบร้อย (${scored.cartItems.length} รายการ)`);
    }
  };

  const confirmTemplateWithOos = () => {
    if (!pendingTemplateLoad) return;
    // Load both in-stock and OOS items
    setCart([...pendingTemplateLoad.cartItems, ...pendingTemplateLoad.oosItems]);
    toast.success(
      `โหลดเทมเพลท "${pendingTemplateLoad.template.name}" เรียบร้อย (${pendingTemplateLoad.cartItems.length} ในสต็อก, ${pendingTemplateLoad.oosItems.length} ไม่มีในสต็อก)`
    );
    setShowOosConfirmModal(false);
    setPendingTemplateLoad(null);
  };

  const confirmTemplateWithoutOos = () => {
    if (!pendingTemplateLoad) return;
    // Load only in-stock items
    setCart(pendingTemplateLoad.cartItems);
    toast.success(
      `โหลดเทมเพลท "${pendingTemplateLoad.template.name}" เรียบร้อย (เฉพาะรายการที่มีในสต็อก ${pendingTemplateLoad.cartItems.length} รายการ)`
    );
    setShowOosConfirmModal(false);
    setPendingTemplateLoad(null);
  };

  const handleAddToCart = (product: ProductSearchResult, inventoryItem: InventorySearchItem) => {
    const existingIndex = cart.findIndex(
      (item) => item.inventory_id === inventoryItem.id
    );

    if (existingIndex >= 0) {
      toast.error('รายการนี้ถูกเพิ่มในตะกร้าแล้ว');
      return;
    }

    const newItem: CartItem = {
      id: `${product.id}-${inventoryItem.id}`,
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      ref_number: product.ref_number,
      inventory_id: inventoryItem.id,
      lot_number: inventoryItem.lot_number,
      expiry_date: inventoryItem.expiry_date,
      quantity: 1,
      available: inventoryItem.available_quantity,
      is_out_of_stock: false,
      specifications: product.specifications,
    };

    setCart([...cart, newItem]);
    toast.success(`เพิ่ม ${product.name} ลงตะกร้าแล้ว`);
    setShowProductDetail(null);
    setSearchTerm('');
  };

  const handleAddOutOfStock = (product: ProductSearchResult) => {
    setOutOfStockProduct(product);
    setOutOfStockRef(product.ref_number || product.sku || '');
    setOutOfStockLot('');
    setOutOfStockQty(1);
    setShowOutOfStockModal(true);
  };

  const confirmOutOfStock = () => {
    if (!outOfStockProduct) return;

    const newItem: CartItem = {
      id: `oos-${outOfStockProduct.id}-${Date.now()}`,
      product_id: outOfStockProduct.id,
      product_name: outOfStockProduct.name,
      product_sku: outOfStockProduct.sku,
      ref_number: outOfStockProduct.ref_number,
      quantity: outOfStockQty,
      is_out_of_stock: true,
      requested_ref: outOfStockRef,
      requested_lot: outOfStockLot || undefined,
      specifications: outOfStockProduct.specifications,
    };

    setCart([...cart, newItem]);
    toast.success(`เพิ่ม ${outOfStockProduct.name} (ไม่มีในสต็อก) ลงตะกร้าแล้ว`);
    setShowOutOfStockModal(false);
    setOutOfStockProduct(null);
    setShowProductDetail(null);
    setSearchTerm('');
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setCart(
      cart.map((item) => {
        if (item.id !== itemId) return item;
        if (!item.is_out_of_stock && quantity > (item.available || 0)) {
          toast.error('จำนวนเกินกว่าที่มีในสต็อก');
          return item;
        }
        return { ...item, quantity };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isDentist) {
      toast.error('เฉพาะทันตแพทย์เท่านั้นที่สามารถจองวัสดุได้');
      return;
    }

    if (!selectedCaseId) {
      toast.error('กรุณาเลือกเคส');
      return;
    }

    if (cart.length === 0) {
      toast.error('กรุณาเพิ่มรายการจองอย่างน้อย 1 รายการ');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create reservations
      const reservations = cart.map((item) => ({
        case_id: selectedCaseId,
        product_id: item.product_id,
        inventory_id: item.inventory_id || null,
        quantity: item.quantity,
        status: 'pending',
        reserved_by: user?.id,
        reserved_at: new Date().toISOString(),
        is_out_of_stock: item.is_out_of_stock,
        requested_ref: item.requested_ref || null,
        requested_lot: item.requested_lot || null,
        requested_specs: item.specifications || null,
      }));

      const { error: reservationError } = await supabase
        .from('case_reservations')
        .insert(reservations);

      if (reservationError) throw reservationError;

      // Note: inventory reserved_quantity is automatically updated by the
      // database trigger 'update_inventory_reserved_on_reservation' on INSERT

      // Determine new case status
      const hasOutOfStock = cart.some((item) => item.is_out_of_stock);
      const newStatus = hasOutOfStock ? 'red' : 'green';

      // Update case status
      await supabase
        .from('cases')
        .update({ status: newStatus })
        .eq('id', selectedCaseId);

      // Send out-of-stock notifications to stock staff
      if (hasOutOfStock && selectedCase) {
        const oosItems = cart.filter((item) => item.is_out_of_stock);
        for (const item of oosItems) {
          try {
            await triggerOutOfStock({
              reservationId: selectedCaseId,
              caseNumber: selectedCase.case_number,
              productName: item.product_name,
              quantity: item.quantity,
              surgeryDate: selectedCase.surgery_date,
            });
          } catch (notifError) {
            console.error('Error sending OOS notification:', notifError);
          }
        }
      }

      toast.success('จองวัสดุเรียบร้อยแล้ว');
      router.push(`/cases/${selectedCaseId}`);
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show warning if not dentist
  if (!isDentist) {
    return (
      <div className="min-h-screen">
        <Header title="จองวัสดุใหม่" subtitle="เลือกวัสดุสำหรับเคสผ่าตัด" />
        <div className="p-4 sm:p-6 lg:p-8">
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  ไม่มีสิทธิ์เข้าถึง
                </h2>
                <p className="text-gray-500 text-center max-w-md">
                  เฉพาะทันตแพทย์เท่านั้นที่สามารถจองวัสดุสำหรับเคสผ่าตัดได้
                  กรุณาติดต่อทันตแพทย์ผู้รับผิดชอบเคส
                </p>
                <Link href="/dashboard">
                  <Button className="mt-6">กลับหน้าหลัก</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="จองวัสดุ" subtitle="เลือกวัสดุสำหรับเคสผ่าตัดของคุณ" />

      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href="/reservations"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายการจอง
        </Link>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Case Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    เลือกเคสผ่าตัด
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    label="เคสของคุณ *"
                    options={caseOptions}
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                  />
                  {selectedCase && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-900">
                            {selectedCase.patient?.first_name} {selectedCase.patient?.last_name}
                          </p>
                          <p className="text-sm text-blue-700">
                            HN: {selectedCase.patient?.hn_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-700">
                            วันผ่าตัด: {formatDate(selectedCase.surgery_date)}
                          </p>
                          {daysUntilSurgery !== null && (
                            <Badge
                              variant={daysUntilSurgery <= 2 ? 'danger' : daysUntilSurgery <= 7 ? 'warning' : 'info'}
                            >
                              {daysUntilSurgery === 0
                                ? 'วันนี้!'
                                : daysUntilSurgery === 1
                                ? 'พรุ่งนี้'
                                : `อีก ${daysUntilSurgery} วัน`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Template Recommendations */}
              {showTemplatePanel && selectedCase && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      เทมเพลทวัสดุแนะนำ
                      <Badge variant="info" size="sm">
                        {selectedCase.procedure_type}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingTemplates ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        <span className="ml-2 text-gray-500">กำลังโหลดเทมเพลท...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {scoredTemplates.map((scored, idx) => (
                          <div
                            key={scored.template.id}
                            className={cn(
                              'p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md',
                              scored.allInStock
                                ? 'border-green-200 bg-green-50 hover:border-green-400'
                                : 'border-orange-200 bg-orange-50 hover:border-orange-400'
                            )}
                            onClick={() => handleSelectTemplate(scored)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{scored.template.name}</h4>
                              {idx === 0 && (
                                <Badge variant="info" size="sm">แนะนำ</Badge>
                              )}
                            </div>
                            {scored.template.description && (
                              <p className="text-xs text-gray-500 mb-2">{scored.template.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {scored.allInStock ? (
                                  <Badge variant="success" size="sm">
                                    <CheckCircle className="w-3 h-3 mr-1 inline" />
                                    มีของครบ {scored.inStockCount}/{scored.totalCount}
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" size="sm">
                                    <AlertTriangle className="w-3 h-3 mr-1 inline" />
                                    มี {scored.inStockCount}/{scored.totalCount}
                                  </Badge>
                                )}
                              </div>
                              <Button size="sm" variant="outline">
                                เลือก
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-3">
                      คลิกเลือกเทมเพลทเพื่อโหลดรายการวัสดุเข้าตะกร้า สามารถแก้ไขได้ก่อนยืนยัน
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Product Search - Shopping Style */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-600" />
                    ค้นหาวัสดุ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Input
                      placeholder="พิมพ์ชื่อสินค้า, REF, หรือ SKU เพื่อค้นหา..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      leftIcon={<Search className="w-4 h-4" />}
                      className="text-lg"
                    />

                    {/* Search Results Dropdown */}
                    {searchTerm.length >= 2 && (
                      <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
                        {isSearching ? (
                          <div className="p-4 text-center text-gray-500">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                            <p className="mt-2">กำลังค้นหา...</p>
                          </div>
                        ) : searchResults && searchResults.length > 0 ? (
                          <div className="divide-y divide-gray-100">
                            {searchResults.map((product) => (
                              <div
                                key={product.id}
                                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => setShowProductDetail(product)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-900">
                                        {product.name}
                                      </span>
                                      {product.is_implant && (
                                        <Badge variant="info" size="sm">Implant</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                      <span>REF: {product.ref_number || product.sku}</span>
                                      {product.brand && <span>{product.brand}</span>}
                                      {product.category_name && (
                                        <span className="text-blue-600">{product.category_name}</span>
                                      )}
                                    </div>
                                    {product.specifications && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {Object.entries(product.specifications as Record<string, string>).map(([key, value]) => (
                                          value && (
                                            <span
                                              key={key}
                                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                                            >
                                              {key}: {String(value)}
                                            </span>
                                          )
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    {product.available_stock > 0 ? (
                                      <Badge variant="success">
                                        มี {product.available_stock} ชิ้น
                                      </Badge>
                                    ) : (
                                      <Badge variant="danger">ไม่มีในสต็อก</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p>ไม่พบสินค้าที่ค้นหา</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mt-2">
                    พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา
                  </p>
                </CardContent>
              </Card>

              {/* Cart Items */}
              {cart.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                      รายการที่เลือก ({cart.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'p-4 rounded-lg border',
                            item.is_out_of_stock
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {item.product_name}
                                </span>
                                {item.is_out_of_stock && (
                                  <Badge variant="danger" size="sm">
                                    ไม่มีในสต็อก
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                <span>REF: {item.requested_ref || item.ref_number || item.product_sku}</span>
                                {item.lot_number && <span className="ml-3">LOT: {item.lot_number}</span>}
                                {item.requested_lot && (
                                  <span className="ml-3">LOT ที่ต้องการ: {item.requested_lot}</span>
                                )}
                                {item.expiry_date && (
                                  <span className="ml-3">
                                    หมดอายุ: {formatDate(item.expiry_date)}
                                  </span>
                                )}
                              </div>
                              {item.specifications && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {Object.entries(item.specifications).map(([key, value]) => (
                                    value && (
                                      <span
                                        key={key}
                                        className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded border"
                                      >
                                        {key}: {value}
                                      </span>
                                    )
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">จำนวน:</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={item.is_out_of_stock ? 99 : item.available}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                                  }
                                  className="w-20"
                                />
                                {!item.is_out_of_stock && (
                                  <span className="text-xs text-gray-400">
                                    / {item.available}
                                  </span>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFromCart(item.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Cart Summary */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-4 border-b">
                      <ShoppingCart className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">รายการทั้งหมด</p>
                      <p className="text-3xl font-bold text-gray-900">{cart.length}</p>
                    </div>

                    {cart.some((item) => item.is_out_of_stock) && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-red-700">
                              มีสินค้าที่ไม่มีในสต็อก
                            </p>
                            <p className="text-red-600 mt-1">
                              ระบบจะแจ้งเตือนเจ้าหน้าที่สต็อกให้สั่งซื้อ
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {daysUntilSurgery !== null && daysUntilSurgery <= 2 && (
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-orange-700">
                              เคสด่วน!
                            </p>
                            <p className="text-orange-600 mt-1">
                              ผ่าตัดภายใน {daysUntilSurgery === 0 ? 'วันนี้' : `${daysUntilSurgery} วัน`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      isLoading={isSubmitting}
                      disabled={cart.length === 0 || !selectedCaseId}
                      leftIcon={<Save className="w-5 h-5" />}
                    >
                      บันทึกการจอง
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Help Card */}
              <Card>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-gray-900 mb-2">วิธีใช้งาน</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>เลือกเคสที่ต้องการจองวัสดุ</li>
                        <li>ค้นหาวัสดุด้วยชื่อ, REF, หรือ SKU</li>
                        <li>เลือก LOT ที่ต้องการใช้</li>
                        <li>หากไม่มีในสต็อก สามารถจองล่วงหน้าได้</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>

      {/* Product Detail Modal */}
      <Modal
        isOpen={!!showProductDetail}
        onClose={() => setShowProductDetail(null)}
        title={showProductDetail?.name || 'รายละเอียดสินค้า'}
        size="lg"
      >
        {showProductDetail && (
          <div className="space-y-4">
            {/* Product Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">REF:</span>
                  <span className="ml-2 font-medium">
                    {showProductDetail.ref_number || showProductDetail.sku}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">SKU:</span>
                  <span className="ml-2 font-medium">{showProductDetail.sku}</span>
                </div>
                {showProductDetail.brand && (
                  <div>
                    <span className="text-gray-500">แบรนด์:</span>
                    <span className="ml-2 font-medium">{showProductDetail.brand}</span>
                  </div>
                )}
                {showProductDetail.category_name && (
                  <div>
                    <span className="text-gray-500">หมวดหมู่:</span>
                    <span className="ml-2 font-medium">{showProductDetail.category_name}</span>
                  </div>
                )}
              </div>
              {showProductDetail.specifications && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">รายละเอียด:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(showProductDetail.specifications).map(([key, value]) => (
                      value && (
                        <span
                          key={key}
                          className="text-sm bg-white text-gray-700 px-3 py-1 rounded-full border"
                        >
                          {key}: {value}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Available Lots */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                เลือก LOT ที่ต้องการ
              </h4>
              {showProductDetail.inventory_items.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {showProductDetail.inventory_items.map((inv) => (
                    <div
                      key={inv.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        inv.recommendation === 'expiring_soon'
                          ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-300'
                          : inv.recommendation === 'most_stock'
                          ? 'border-green-200 bg-green-50 hover:border-green-300'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      )}
                      onClick={() => handleAddToCart(showProductDetail, inv)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">LOT: {inv.lot_number}</span>
                            {inv.recommendation === 'expiring_soon' && (
                              <Badge variant="warning" size="sm">ใกล้หมดอายุ</Badge>
                            )}
                            {inv.recommendation === 'most_stock' && (
                              <Badge variant="success" size="sm">แนะนำ</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {inv.expiry_date ? (
                              <span>
                                หมดอายุ: {formatDate(inv.expiry_date)}
                                {inv.days_until_expiry !== null && (
                                  <span className="ml-1">
                                    ({inv.days_until_expiry} วัน)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span>ไม่ระบุวันหมดอายุ</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-gray-900">
                            {inv.available_quantity}
                          </span>
                          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                            เพิ่ม
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">ไม่มีสินค้านี้ในสต็อก</p>
                  <Button
                    variant="outline"
                    onClick={() => handleAddOutOfStock(showProductDetail)}
                    leftIcon={<AlertTriangle className="w-4 h-4" />}
                  >
                    จองล่วงหน้า (แจ้งให้สั่งซื้อ)
                  </Button>
                </div>
              )}
            </div>

            {/* Out of stock option */}
            {showProductDetail.inventory_items.length > 0 && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleAddOutOfStock(showProductDetail)}
                  leftIcon={<AlertTriangle className="w-4 h-4" />}
                >
                  ต้องการ LOT/REF อื่นที่ไม่มีในสต็อก
                </Button>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowProductDetail(null)}>
            ปิด
          </Button>
        </ModalFooter>
      </Modal>

      {/* Template OOS Confirmation Modal */}
      <Modal
        isOpen={showOosConfirmModal}
        onClose={() => { setShowOosConfirmModal(false); setPendingTemplateLoad(null); }}
        title="วัสดุบางรายการไม่มีในสต็อก"
      >
        {pendingTemplateLoad && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">
                    เทมเพลท &quot;{pendingTemplateLoad.template.name}&quot; มีวัสดุบางรายการไม่มีในสต็อก
                  </p>
                  <p className="text-yellow-700 mt-1">
                    ระบบจะแจ้งเตือนเจ้าหน้าที่สต็อกให้จัดหาสินค้า
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-gray-900 text-sm">รายการที่ไม่มีในสต็อก:</p>
              {pendingTemplateLoad.oosItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.product_name}</p>
                    <p className="text-xs text-gray-500">REF: {item.requested_ref || item.ref_number}</p>
                  </div>
                  <span className="text-sm text-red-600 font-medium">x {item.quantity}</span>
                </div>
              ))}
            </div>

            {pendingTemplateLoad.cartItems.length > 0 && (
              <div className="text-sm text-gray-500">
                <p>รายการที่มีในสต็อก: {pendingTemplateLoad.cartItems.length} รายการ</p>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => { setShowOosConfirmModal(false); setPendingTemplateLoad(null); }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="outline"
            onClick={confirmTemplateWithoutOos}
          >
            เฉพาะที่มีในสต็อก
          </Button>
          <Button onClick={confirmTemplateWithOos}>
            จองทั้งหมด (รวม OOS)
          </Button>
        </ModalFooter>
      </Modal>

      {/* Out of Stock Request Modal */}
      <Modal
        isOpen={showOutOfStockModal}
        onClose={() => setShowOutOfStockModal(false)}
        title="จองสินค้าที่ไม่มีในสต็อก"
      >
        {outOfStockProduct && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">
                    สินค้านี้ไม่มีในสต็อก
                  </p>
                  <p className="text-yellow-700 mt-1">
                    ระบบจะแจ้งเตือนเจ้าหน้าที่สต็อกให้สั่งซื้อสินค้านี้
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-2">{outOfStockProduct.name}</p>
            </div>

            <Input
              label="REF ที่ต้องการ *"
              value={outOfStockRef}
              onChange={(e) => setOutOfStockRef(e.target.value)}
              placeholder="ระบุ REF number"
            />

            <Input
              label="LOT ที่ต้องการ (ถ้ามี)"
              value={outOfStockLot}
              onChange={(e) => setOutOfStockLot(e.target.value)}
              placeholder="ระบุ LOT number (ไม่บังคับ)"
            />

            <Input
              label="จำนวน *"
              type="number"
              min={1}
              value={outOfStockQty}
              onChange={(e) => setOutOfStockQty(parseInt(e.target.value) || 1)}
            />
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowOutOfStockModal(false)}>
            ยกเลิก
          </Button>
          <Button
            onClick={confirmOutOfStock}
            disabled={!outOfStockRef}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            เพิ่มลงตะกร้า
          </Button>
        </ModalFooter>
      </Modal>

      {/* Cart Replace Confirmation */}
      <ConfirmModal
        isOpen={showCartReplaceConfirm}
        onClose={() => { setShowCartReplaceConfirm(false); setPendingCartReplaceTemplate(null); }}
        onConfirm={() => {
          setShowCartReplaceConfirm(false);
          if (pendingCartReplaceTemplate) {
            proceedWithTemplate(pendingCartReplaceTemplate);
            setPendingCartReplaceTemplate(null);
          }
        }}
        title="เปลี่ยนรายการในตะกร้า"
        message="ต้องการเปลี่ยนรายการในตะกร้า? รายการเดิมจะถูกแทนที่ด้วยเทมเพลทที่เลือก"
        variant="warning"
        confirmText="เปลี่ยน"
        cancelText="ยกเลิก"
      />
    </div>
  );
}
