'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  Trash2,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  Info,
  Sparkles,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react';
import {
  Button,
  Input,
  Badge,
  Modal,
  ModalFooter,
  ConfirmModal,
} from '@/components/ui';
import { useProductSearch } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { formatDate, daysUntil, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type {
  ProductSearchResult,
  InventorySearchItem,
  ProductSpecifications,
  MaterialTemplate,
  MaterialTemplateItem,
} from '@/types/database';
import { triggerOutOfStock } from '@/lib/notification-triggers';

interface CartItem {
  id: string;
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

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseNumber: string;
  procedureType?: string | null;
  surgeryDate: string;
  patientName: string;
  onSuccess: () => void;
}

export function ReservationModal({
  isOpen,
  onClose,
  caseId,
  caseNumber,
  procedureType,
  surgeryDate,
  patientName,
  onSuccess,
}: ReservationModalProps) {
  const { user } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // OOS request state
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);
  const [outOfStockProduct, setOutOfStockProduct] = useState<ProductSearchResult | null>(null);
  const [outOfStockRef, setOutOfStockRef] = useState('');
  const [outOfStockLot, setOutOfStockLot] = useState('');
  const [outOfStockQty, setOutOfStockQty] = useState(1);

  // Template state
  const [scoredTemplates, setScoredTemplates] = useState<TemplateWithScore[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showOosConfirmModal, setShowOosConfirmModal] = useState(false);
  const [pendingTemplateLoad, setPendingTemplateLoad] = useState<TemplateWithScore | null>(null);
  const [showCartReplaceConfirm, setShowCartReplaceConfirm] = useState(false);
  const [pendingCartReplaceTemplate, setPendingCartReplaceTemplate] = useState<TemplateWithScore | null>(null);

  const { data: searchResults, isLoading: isSearching } = useProductSearch(searchTerm);

  const daysUntilSurgery = useMemo(() => daysUntil(surgeryDate), [surgeryDate]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCart([]);
      setSearchTerm('');
      setExpandedProductId(null);
    }
  }, [isOpen]);

  // Fetch and score templates when modal opens
  useEffect(() => {
    if (!isOpen || !procedureType) {
      setScoredTemplates([]);
      return;
    }

    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const { data: ptData } = await supabase
          .from('procedure_types')
          .select('id')
          .eq('value', procedureType)
          .eq('is_active', true)
          .single();

        if (!ptData) {
          setScoredTemplates([]);
          return;
        }

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
          return;
        }

        const scored: TemplateWithScore[] = [];

        for (const template of templates) {
          const items = (template.items || []) as (MaterialTemplateItem & { product: any })[];
          let score = 0;
          let inStockCount = 0;
          const cartItems: CartItem[] = [];
          const oosItems: CartItem[] = [];

          for (const item of items) {
            if (!item.product) continue;

            const { data: inventory } = await supabase
              .from('inventory')
              .select('id, lot_number, expiry_date, available_quantity')
              .eq('product_id', item.product_id)
              .gt('available_quantity', 0)
              .order('expiry_date', { ascending: true, nullsFirst: false });

            if (inventory && inventory.length > 0) {
              let bestLot = inventory[0];
              if (bestLot.available_quantity < item.quantity) {
                const mostStock = [...inventory].sort(
                  (a, b) => b.available_quantity - a.available_quantity
                )[0];
                if (mostStock.available_quantity >= item.quantity) {
                  bestLot = mostStock;
                }
              }

              const daysUntilExp = bestLot.expiry_date
                ? Math.ceil(
                    (new Date(bestLot.expiry_date).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;

              inStockCount++;
              score += 100;
              if (daysUntilExp !== null && daysUntilExp <= 90) score += 50;
              if (bestLot.available_quantity >= item.quantity * 2) score += 25;

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
              oosItems.push({
                id: `oos-${item.product_id}-${Date.now()}-${Math.random()}`,
                product_id: item.product_id,
                product_name: item.product.name,
                product_sku: item.product.sku,
                ref_number: item.product.ref_number,
                quantity: item.quantity,
                is_out_of_stock: true,
                requested_ref: item.product.ref_number || item.product.sku || '',
                specifications: item.product.specifications,
              });
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

        scored.sort((a, b) => b.score - a.score);
        setScoredTemplates(scored);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [isOpen, procedureType]);

  // Template handlers
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
      setPendingTemplateLoad(scored);
      setShowOosConfirmModal(true);
    } else {
      setCart(scored.cartItems);
      toast.success(
        `เพิ่ม "${scored.template.name}" (${scored.cartItems.length} รายการ)`
      );
    }
  };

  const confirmTemplateWithOos = () => {
    if (!pendingTemplateLoad) return;
    setCart([...pendingTemplateLoad.cartItems, ...pendingTemplateLoad.oosItems]);
    toast.success(
      `เพิ่ม "${pendingTemplateLoad.template.name}" (${pendingTemplateLoad.cartItems.length} มีสต็อก, ${pendingTemplateLoad.oosItems.length} ไม่มีสต็อก)`
    );
    setShowOosConfirmModal(false);
    setPendingTemplateLoad(null);
  };

  const confirmTemplateWithoutOos = () => {
    if (!pendingTemplateLoad) return;
    setCart(pendingTemplateLoad.cartItems);
    toast.success(
      `เพิ่ม "${pendingTemplateLoad.template.name}" (เฉพาะที่มีสต็อก ${pendingTemplateLoad.cartItems.length} รายการ)`
    );
    setShowOosConfirmModal(false);
    setPendingTemplateLoad(null);
  };

  // Cart handlers
  const handleAddToCart = (product: ProductSearchResult, inventoryItem: InventorySearchItem) => {
    const existingIndex = cart.findIndex((item) => item.inventory_id === inventoryItem.id);
    if (existingIndex >= 0) {
      toast.error('รายการนี้ถูกเพิ่มแล้ว');
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
    toast.success(`เพิ่ม ${product.name}`);
    setExpandedProductId(null);
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
    toast.success(`เพิ่ม ${outOfStockProduct.name} (ไม่มีในสต็อก)`);
    setShowOutOfStockModal(false);
    setOutOfStockProduct(null);
    setExpandedProductId(null);
    setSearchTerm('');
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.id !== itemId) return item;
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        if (!item.is_out_of_stock && newQty > (item.available || 0)) {
          toast.error('จำนวนเกินสต็อก');
          return item;
        }
        if (item.is_out_of_stock && newQty > 99) return item;
        return { ...item, quantity: newQty };
      })
    );
  };

  // Submit
  const handleSubmit = async () => {
    if (!user || user.role !== 'dentist') {
      toast.error('เฉพาะทันตแพทย์เท่านั้นที่สามารถจองวัสดุได้');
      return;
    }

    if (cart.length === 0) {
      toast.error('กรุณาเพิ่มรายการจองอย่างน้อย 1 รายการ');
      return;
    }

    setIsSubmitting(true);

    try {
      const reservations = cart.map((item) => ({
        case_id: caseId,
        product_id: item.product_id,
        inventory_id: item.inventory_id || null,
        quantity: item.quantity,
        status: 'pending',
        reserved_by: user.id,
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

      const hasOutOfStock = cart.some((item) => item.is_out_of_stock);
      const newStatus = hasOutOfStock ? 'red' : 'green';

      await supabase.from('cases').update({ status: newStatus }).eq('id', caseId);

      if (hasOutOfStock) {
        const oosItems = cart.filter((item) => item.is_out_of_stock);
        for (const item of oosItems) {
          try {
            await triggerOutOfStock({
              reservationId: caseId,
              caseNumber,
              productName: item.product_name,
              quantity: item.quantity,
              surgeryDate,
            });
          } catch (notifError) {
            console.error('Error sending OOS notification:', notifError);
          }
        }
      }

      toast.success('จองวัสดุเรียบร้อยแล้ว');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inStockItems = cart.filter((i) => !i.is_out_of_stock);
  const oosItems = cart.filter((i) => i.is_out_of_stock);

  return (
    <>
      <Modal
        isOpen={isOpen && !showOutOfStockModal && !showOosConfirmModal}
        onClose={onClose}
        title="จองวัสดุ"
        description={`${caseNumber} - ${patientName} | ผ่าตัด ${formatDate(surgeryDate)}`}
        size="full"
        showCloseButton
      >
        <div className="space-y-5">
          {/* Surgery countdown */}
          {daysUntilSurgery !== null && daysUntilSurgery <= 7 && (
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                daysUntilSurgery <= 2
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-orange-50 text-orange-700 border border-orange-200'
              )}
            >
              <Clock className="w-4 h-4 shrink-0" />
              {daysUntilSurgery === 0
                ? 'ผ่าตัดวันนี้!'
                : daysUntilSurgery === 1
                ? 'ผ่าตัดพรุ่งนี้!'
                : `ผ่าตัดอีก ${daysUntilSurgery} วัน`}
            </div>
          )}

          {/* ─── Section 1: Template Recommendations ─── */}
          {procedureType && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                เทมเพลทแนะนำ
                <Badge variant="info" size="sm">{procedureType}</Badge>
              </h3>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                  <span className="ml-2 text-sm text-gray-500">กำลังโหลด...</span>
                </div>
              ) : scoredTemplates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scoredTemplates.map((scored, idx) => (
                    <button
                      key={scored.template.id}
                      type="button"
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all hover:shadow-md active:scale-[0.98]',
                        scored.allInStock
                          ? 'border-green-200 bg-green-50/70 hover:border-green-400'
                          : 'border-orange-200 bg-orange-50/70 hover:border-orange-400'
                      )}
                      onClick={() => handleSelectTemplate(scored)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-medium text-gray-900 text-sm leading-tight">
                          {scored.template.name}
                        </span>
                        {idx === 0 && (
                          <Badge variant="info" size="sm">แนะนำ</Badge>
                        )}
                      </div>
                      {scored.template.description && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                          {scored.template.description}
                        </p>
                      )}
                      {scored.allInStock ? (
                        <div className="flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          มีครบ {scored.inStockCount}/{scored.totalCount} รายการ
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-orange-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          มี {scored.inStockCount}/{scored.totalCount} รายการ
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-lg text-sm text-gray-400">
                  ไม่มีเทมเพลทสำหรับ {procedureType}
                </div>
              )}
            </section>
          )}

          {/* ─── Section 2: Search ─── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
              <Search className="w-4 h-4 text-blue-500" />
              ค้นหาเพิ่มเติม
            </h3>
            <div className="relative">
              <Input
                placeholder="พิมพ์ชื่อสินค้า, REF, หรือ SKU..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setExpandedProductId(null);
                }}
                leftIcon={<Search className="w-4 h-4" />}
              />

              {/* Search Results Dropdown */}
              {searchTerm.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      <p className="mt-1 text-sm">กำลังค้นหา...</p>
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {searchResults.map((product) => {
                        const isExpanded = expandedProductId === product.id;
                        return (
                          <div key={product.id}>
                            {/* Product Row */}
                            <div
                              className={cn(
                                'px-3 py-2.5 cursor-pointer transition-colors',
                                isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'
                              )}
                              onClick={() =>
                                setExpandedProductId(isExpanded ? null : product.id)
                              }
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-gray-900 truncate">
                                      {product.name}
                                    </span>
                                    {product.is_implant && (
                                      <Badge variant="info" size="sm">Implant</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                    <span>REF: {product.ref_number || product.sku}</span>
                                    {product.brand && (
                                      <span className="text-gray-400">{product.brand}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {product.available_stock > 0 ? (
                                    <Badge variant="success" size="sm">
                                      มี {product.available_stock}
                                    </Badge>
                                  ) : (
                                    <Badge variant="danger" size="sm">หมด</Badge>
                                  )}
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expanded LOT Selection */}
                            {isExpanded && (
                              <div className="px-3 pb-3 bg-blue-50/50">
                                {product.inventory_items.length > 0 ? (
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-gray-500 pt-1">
                                      เลือก LOT:
                                    </p>
                                    {product.inventory_items.map((inv) => {
                                      const alreadyAdded = cart.some(
                                        (c) => c.inventory_id === inv.id
                                      );
                                      const rec = inv.recommendation as string;
                                      return (
                                        <div
                                          key={inv.id}
                                          className={cn(
                                            'flex items-center justify-between p-2 rounded-lg border text-sm',
                                            alreadyAdded
                                              ? 'border-gray-200 bg-gray-100 opacity-60'
                                              : rec === 'expiring_soon'
                                              ? 'border-yellow-200 bg-yellow-50'
                                              : rec === 'most_stock'
                                              ? 'border-green-200 bg-green-50'
                                              : 'border-gray-200 bg-white'
                                          )}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-xs">
                                                LOT: {inv.lot_number}
                                              </span>
                                              {rec === 'expiring_soon' && (
                                                <Badge variant="warning" size="sm">ใกล้หมดอายุ</Badge>
                                              )}
                                              {rec === 'most_stock' && (
                                                <Badge variant="success" size="sm">แนะนำ</Badge>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                              {inv.expiry_date
                                                ? `หมดอายุ: ${formatDate(inv.expiry_date)}`
                                                : 'ไม่ระบุวันหมดอายุ'}
                                              <span className="ml-2">
                                                พร้อมใช้: {inv.available_quantity}
                                              </span>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            disabled={alreadyAdded}
                                            className={cn(
                                              'ml-2 shrink-0 p-1.5 rounded-lg transition-colors',
                                              alreadyAdded
                                                ? 'text-gray-300 cursor-not-allowed'
                                                : 'text-blue-600 hover:bg-blue-100 active:bg-blue-200'
                                            )}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!alreadyAdded) {
                                                handleAddToCart(product, inv);
                                              }
                                            }}
                                          >
                                            {alreadyAdded ? (
                                              <CheckCircle className="w-5 h-5" />
                                            ) : (
                                              <Plus className="w-5 h-5" />
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })}
                                    {/* OOS option */}
                                    <button
                                      type="button"
                                      className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddOutOfStock(product);
                                      }}
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      ต้องการ REF/LOT อื่นที่ไม่มีในสต็อก
                                    </button>
                                  </div>
                                ) : (
                                  <div className="pt-2 text-center">
                                    <p className="text-sm text-gray-500 mb-2">
                                      ไม่มีสินค้านี้ในสต็อก
                                    </p>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-300 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddOutOfStock(product);
                                      }}
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      จองล่วงหน้า (แจ้งให้สั่งซื้อ)
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                      <p className="text-sm">ไม่พบสินค้าที่ค้นหา</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">พิมพ์อย่างน้อย 2 ตัวอักษร</p>
          </section>

          {/* ─── Section 3: Selected Items ─── */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
              <ClipboardList className="w-4 h-4 text-indigo-500" />
              รายการที่เลือก
              {cart.length > 0 && (
                <span className="text-xs font-normal text-gray-400">
                  ({cart.length} รายการ)
                </span>
              )}
            </h3>

            {cart.length === 0 ? (
              <div className="py-6 text-center rounded-lg border-2 border-dashed border-gray-200">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">ยังไม่มีรายการ</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  เลือกจากเทมเพลทหรือค้นหาวัสดุด้านบน
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* In-stock items */}
                {inStockItems.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50/30 overflow-hidden">
                    <div className="px-3 py-1.5 bg-green-100/60 border-b border-green-200">
                      <span className="text-xs font-medium text-green-700">
                        มีสต็อก ({inStockItems.length})
                      </span>
                    </div>
                    <div className="divide-y divide-green-100">
                      {inStockItems.map((item) => (
                        <SelectedItemRow
                          key={item.id}
                          item={item}
                          onQuantityChange={handleQuantityChange}
                          onRemove={handleRemoveFromCart}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* OOS items */}
                {oosItems.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50/30 overflow-hidden">
                    <div className="px-3 py-1.5 bg-red-100/60 border-b border-red-200">
                      <span className="text-xs font-medium text-red-700">
                        ไม่มีในสต็อก ({oosItems.length})
                      </span>
                    </div>
                    <div className="divide-y divide-red-100">
                      {oosItems.map((item) => (
                        <SelectedItemRow
                          key={item.id}
                          item={item}
                          onQuantityChange={handleQuantityChange}
                          onRemove={handleRemoveFromCart}
                        />
                      ))}
                    </div>
                    <div className="px-3 py-2 bg-red-50 border-t border-red-200">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">
                          ระบบจะแจ้งเจ้าหน้าที่สต็อกให้สั่งซื้อสินค้าเหล่านี้
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Help text when empty */}
          {cart.length === 0 && !procedureType && (
            <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-lg text-left border border-blue-100">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p className="font-medium text-gray-900 mb-0.5">วิธีใช้งาน</p>
                <ul className="space-y-0.5 list-disc list-inside text-gray-500">
                  <li>ค้นหาวัสดุด้วยชื่อ, REF, หรือ SKU</li>
                  <li>เลือก LOT ที่ต้องการใช้</li>
                  <li>หากไม่มีในสต็อก สามารถจองล่วงหน้าได้</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={cart.length === 0}
            leftIcon={<Save className="w-4 h-4" />}
          >
            บันทึกการจอง ({cart.length})
          </Button>
        </ModalFooter>
      </Modal>

      {/* Template OOS Confirmation */}
      <Modal
        isOpen={showOosConfirmModal}
        onClose={() => {
          setShowOosConfirmModal(false);
          setPendingTemplateLoad(null);
        }}
        title="วัสดุบางรายการไม่มีในสต็อก"
      >
        {pendingTemplateLoad && (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">
                    &quot;{pendingTemplateLoad.template.name}&quot; มีบางรายการไม่มีในสต็อก
                  </p>
                  <p className="text-yellow-700 text-xs mt-0.5">
                    ระบบจะแจ้งเจ้าหน้าที่สต็อกให้จัดหา
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">รายการที่ไม่มีในสต็อก:</p>
              {pendingTemplateLoad.oosItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.product_name}</p>
                    <p className="text-xs text-gray-500">
                      REF: {item.requested_ref || item.ref_number}
                    </p>
                  </div>
                  <span className="text-sm text-red-600 font-medium">x{item.quantity}</span>
                </div>
              ))}
            </div>

            {pendingTemplateLoad.cartItems.length > 0 && (
              <p className="text-xs text-gray-500">
                มีในสต็อก: {pendingTemplateLoad.cartItems.length} รายการ
              </p>
            )}
          </div>
        )}
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowOosConfirmModal(false);
              setPendingTemplateLoad(null);
            }}
          >
            ยกเลิก
          </Button>
          <Button variant="outline" onClick={confirmTemplateWithoutOos}>
            เฉพาะที่มีสต็อก
          </Button>
          <Button onClick={confirmTemplateWithOos}>จองทั้งหมด</Button>
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
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">สินค้านี้ไม่มีในสต็อก</p>
                  <p className="text-yellow-700 text-xs mt-0.5">
                    ระบบจะแจ้งเจ้าหน้าที่สต็อกให้สั่งซื้อ
                  </p>
                </div>
              </div>
            </div>

            <p className="font-medium text-gray-900 text-sm">{outOfStockProduct.name}</p>

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
            เพิ่มรายการ
          </Button>
        </ModalFooter>
      </Modal>

      {/* Cart Replace Confirmation */}
      <ConfirmModal
        isOpen={showCartReplaceConfirm}
        onClose={() => {
          setShowCartReplaceConfirm(false);
          setPendingCartReplaceTemplate(null);
        }}
        onConfirm={() => {
          setShowCartReplaceConfirm(false);
          if (pendingCartReplaceTemplate) {
            proceedWithTemplate(pendingCartReplaceTemplate);
            setPendingCartReplaceTemplate(null);
          }
        }}
        title="เปลี่ยนรายการ"
        message="ต้องการเปลี่ยนรายการ? รายการเดิมจะถูกแทนที่ด้วยเทมเพลทที่เลือก"
        variant="warning"
        confirmText="เปลี่ยน"
        cancelText="ยกเลิก"
      />
    </>
  );
}

// ─── Sub-component: Selected Item Row ───

function SelectedItemRow({
  item,
  onQuantityChange,
  onRemove,
}: {
  item: CartItem;
  onQuantityChange: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 leading-tight truncate">
            {item.product_name}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-gray-500">
            {item.product_sku && <span>SKU: {item.product_sku}</span>}
            {item.lot_number && <span>LOT: {item.lot_number}</span>}
            {item.requested_ref && !item.lot_number && (
              <span>REF: {item.requested_ref}</span>
            )}
            {item.expiry_date && (
              <span>Exp: {formatDate(item.expiry_date)}</span>
            )}
          </div>
        </div>

        {/* Quantity controls + Delete */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Minus */}
          <button
            type="button"
            disabled={item.quantity <= 1}
            className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center border transition-colors',
              item.quantity <= 1
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100 active:bg-gray-200'
            )}
            onClick={() => onQuantityChange(item.id, -1)}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Quantity display */}
          <div className="text-center min-w-[2.5rem]">
            <span className="text-sm font-semibold text-gray-900">{item.quantity}</span>
            {!item.is_out_of_stock && item.available && (
              <span className="text-xs text-gray-400">/{item.available}</span>
            )}
          </div>

          {/* Plus */}
          <button
            type="button"
            disabled={
              !item.is_out_of_stock && item.quantity >= (item.available || 0)
            }
            className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center border transition-colors',
              !item.is_out_of_stock && item.quantity >= (item.available || 0)
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100 active:bg-gray-200'
            )}
            onClick={() => onQuantityChange(item.id, 1)}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            type="button"
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-0.5"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
