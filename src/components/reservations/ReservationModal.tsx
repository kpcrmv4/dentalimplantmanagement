'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  Info,
  ShoppingCart,
  Sparkles,
  Loader2,
  Save,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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
  const [showProductDetail, setShowProductDetail] = useState<ProductSearchResult | null>(null);
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);
  const [outOfStockProduct, setOutOfStockProduct] = useState<ProductSearchResult | null>(null);
  const [outOfStockRef, setOutOfStockRef] = useState('');
  const [outOfStockLot, setOutOfStockLot] = useState('');
  const [outOfStockQty, setOutOfStockQty] = useState(1);

  // Template recommendation state
  const [scoredTemplates, setScoredTemplates] = useState<TemplateWithScore[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showOosConfirmModal, setShowOosConfirmModal] = useState(false);
  const [pendingTemplateLoad, setPendingTemplateLoad] = useState<TemplateWithScore | null>(null);
  const [showCartReplaceConfirm, setShowCartReplaceConfirm] = useState(false);
  const [pendingCartReplaceTemplate, setPendingCartReplaceTemplate] = useState<TemplateWithScore | null>(null);

  // Step state: 'browse' | 'cart'
  const [step, setStep] = useState<'browse' | 'cart'>('browse');

  const { data: searchResults, isLoading: isSearching } = useProductSearch(searchTerm);

  const daysUntilSurgery = useMemo(() => daysUntil(surgeryDate), [surgeryDate]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCart([]);
      setSearchTerm('');
      setShowProductDetail(null);
      setStep('browse');
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
      setStep('cart');
      toast.success(
        `โหลดเทมเพลท "${scored.template.name}" (${scored.cartItems.length} รายการ)`
      );
    }
  };

  const confirmTemplateWithOos = () => {
    if (!pendingTemplateLoad) return;
    setCart([...pendingTemplateLoad.cartItems, ...pendingTemplateLoad.oosItems]);
    setStep('cart');
    toast.success(
      `โหลดเทมเพลท "${pendingTemplateLoad.template.name}" (${pendingTemplateLoad.cartItems.length} ในสต็อก, ${pendingTemplateLoad.oosItems.length} ไม่มีในสต็อก)`
    );
    setShowOosConfirmModal(false);
    setPendingTemplateLoad(null);
  };

  const confirmTemplateWithoutOos = () => {
    if (!pendingTemplateLoad) return;
    setCart(pendingTemplateLoad.cartItems);
    setStep('cart');
    toast.success(
      `โหลดเทมเพลท "${pendingTemplateLoad.template.name}" (เฉพาะที่มีในสต็อก ${pendingTemplateLoad.cartItems.length} รายการ)`
    );
    setShowOosConfirmModal(false);
    setPendingTemplateLoad(null);
  };

  // Cart handlers
  const handleAddToCart = (product: ProductSearchResult, inventoryItem: InventorySearchItem) => {
    const existingIndex = cart.findIndex((item) => item.inventory_id === inventoryItem.id);
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

      // Note: inventory reserved_quantity is automatically updated by the
      // database trigger 'update_inventory_reserved_on_reservation' on INSERT

      // Determine new case status
      const hasOutOfStock = cart.some((item) => item.is_out_of_stock);
      const newStatus = hasOutOfStock ? 'red' : 'yellow';

      await supabase.from('cases').update({ status: newStatus }).eq('id', caseId);

      // Send OOS notifications
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

  const inStockCount = cart.filter((i) => !i.is_out_of_stock).length;
  const oosCount = cart.filter((i) => i.is_out_of_stock).length;

  return (
    <>
      <Modal
        isOpen={isOpen && !showProductDetail && !showOutOfStockModal && !showOosConfirmModal}
        onClose={onClose}
        title="จองวัสดุ"
        description={`${caseNumber} - ${patientName} | ผ่าตัด ${formatDate(surgeryDate)}`}
        size="full"
      >
        <div className="space-y-6">
          {/* Surgery countdown badge */}
          {daysUntilSurgery !== null && daysUntilSurgery <= 7 && (
            <div
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg text-sm',
                daysUntilSurgery <= 2
                  ? 'bg-red-50 text-red-700'
                  : 'bg-orange-50 text-orange-700'
              )}
            >
              <Clock className="w-4 h-4" />
              <span className="font-medium">
                {daysUntilSurgery === 0
                  ? 'ผ่าตัดวันนี้!'
                  : daysUntilSurgery === 1
                  ? 'ผ่าตัดพรุ่งนี้!'
                  : `ผ่าตัดอีก ${daysUntilSurgery} วัน`}
              </span>
            </div>
          )}

          {step === 'browse' && (
            <>
              {/* Template Recommendations */}
              {procedureType && (
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    เทมเพลทวัสดุแนะนำ
                    <Badge variant="info" size="sm">
                      {procedureType}
                    </Badge>
                  </h3>
                  {loadingTemplates ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                      <span className="ml-2 text-gray-500">กำลังโหลดเทมเพลท...</span>
                    </div>
                  ) : scoredTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            <h4 className="font-medium text-gray-900 text-sm">
                              {scored.template.name}
                            </h4>
                            {idx === 0 && (
                              <Badge variant="info" size="sm">
                                แนะนำ
                              </Badge>
                            )}
                          </div>
                          {scored.template.description && (
                            <p className="text-xs text-gray-500 mb-2">
                              {scored.template.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div>
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
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg text-sm text-gray-500">
                      ไม่มีเทมเพลทสำหรับประเภทการรักษานี้
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500">หรือค้นหาวัสดุ</span>
                </div>
              </div>

              {/* Product Search */}
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                  <Search className="w-5 h-5 text-blue-600" />
                  ค้นหาวัสดุ
                </h3>
                <div className="relative">
                  <Input
                    placeholder="พิมพ์ชื่อสินค้า, REF, หรือ SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                  />

                  {searchTerm.length >= 2 && (
                    <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-72 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center text-gray-500">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          <p className="mt-2 text-sm">กำลังค้นหา...</p>
                        </div>
                      ) : searchResults && searchResults.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                          {searchResults.map((product) => (
                            <div
                              key={product.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => setShowProductDetail(product)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 text-sm truncate">
                                      {product.name}
                                    </span>
                                    {product.is_implant && (
                                      <Badge variant="info" size="sm">
                                        Implant
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <span>REF: {product.ref_number || product.sku}</span>
                                    {product.brand && <span>{product.brand}</span>}
                                  </div>
                                  {product.specifications && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {Object.entries(
                                        product.specifications as Record<string, string>
                                      ).map(
                                        ([key, value]) =>
                                          value && (
                                            <span
                                              key={key}
                                              className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                                            >
                                              {key}: {String(value)}
                                            </span>
                                          )
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="ml-3">
                                  {product.available_stock > 0 ? (
                                    <Badge variant="success" size="sm">
                                      มี {product.available_stock}
                                    </Badge>
                                  ) : (
                                    <Badge variant="danger" size="sm">
                                      หมด
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">ไม่พบสินค้าที่ค้นหา</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">พิมพ์อย่างน้อย 2 ตัวอักษร</p>
              </div>
            </>
          )}

          {/* Cart Summary (always visible when items exist) */}
          {cart.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  ตะกร้า ({cart.length} รายการ)
                </h3>
                <div className="flex gap-2">
                  {step === 'cart' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStep('browse')}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      เพิ่มวัสดุ
                    </Button>
                  )}
                  {step === 'browse' && (
                    <Button size="sm" variant="outline" onClick={() => setStep('cart')}>
                      ดูตะกร้า
                    </Button>
                  )}
                </div>
              </div>

              {step === 'cart' && (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3 rounded-lg border',
                        item.is_out_of_stock
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-gray-50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">
                              {item.product_name}
                            </span>
                            {item.is_out_of_stock && (
                              <Badge variant="danger" size="sm">
                                ไม่มีในสต็อก
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            <span>
                              REF: {item.requested_ref || item.ref_number || item.product_sku}
                            </span>
                            {item.lot_number && (
                              <span className="ml-2">LOT: {item.lot_number}</span>
                            )}
                            {item.requested_lot && (
                              <span className="ml-2">LOT ที่ต้องการ: {item.requested_lot}</span>
                            )}
                            {item.expiry_date && (
                              <span className="ml-2">
                                หมดอายุ: {formatDate(item.expiry_date)}
                              </span>
                            )}
                          </div>
                          {item.specifications && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(item.specifications).map(
                                ([key, value]) =>
                                  value && (
                                    <span
                                      key={key}
                                      className="text-xs bg-white text-gray-600 px-1.5 py-0.5 rounded border"
                                    >
                                      {key}: {value}
                                    </span>
                                  )
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={1}
                              max={item.is_out_of_stock ? 99 : item.available}
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                              }
                              className="w-16 text-sm"
                            />
                            {!item.is_out_of_stock && (
                              <span className="text-xs text-gray-400">/{item.available}</span>
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

                  {/* OOS warning */}
                  {oosCount > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-red-700">
                            มี {oosCount} รายการไม่มีในสต็อก
                          </p>
                          <p className="text-red-600 text-xs mt-0.5">
                            ระบบจะแจ้งเตือนเจ้าหน้าที่สต็อกให้สั่งซื้อ
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 'browse' && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>
                      ในตะกร้า: {inStockCount} รายการในสต็อก
                      {oosCount > 0 && `, ${oosCount} ไม่มีในสต็อก`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty cart + browse hint */}
          {cart.length === 0 && step === 'browse' && (
            <div className="text-center py-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg text-left">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900 mb-1">วิธีใช้งาน</p>
                  <ul className="space-y-0.5 list-disc list-inside text-xs">
                    <li>เลือกเทมเพลทวัสดุแนะนำ หรือค้นหาวัสดุด้วยชื่อ/REF/SKU</li>
                    <li>เลือก LOT ที่ต้องการใช้</li>
                    <li>หากไม่มีในสต็อก สามารถจองล่วงหน้าได้ ระบบจะแจ้งสต็อก</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit footer */}
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
            บันทึกการจอง ({cart.length} รายการ)
          </Button>
        </ModalFooter>
      </Modal>

      {/* Product Detail Modal (Lot selection) */}
      <Modal
        isOpen={!!showProductDetail}
        onClose={() => setShowProductDetail(null)}
        title={showProductDetail?.name || 'รายละเอียดสินค้า'}
        size="lg"
      >
        {showProductDetail && (
          <div className="space-y-4">
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
              </div>
              {showProductDetail.specifications && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(showProductDetail.specifications).map(
                      ([key, value]) =>
                        value && (
                          <span
                            key={key}
                            className="text-sm bg-white text-gray-700 px-2 py-1 rounded-full border"
                          >
                            {key}: {value}
                          </span>
                        )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">เลือก LOT ที่ต้องการ</h4>
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
                            <span className="font-medium text-sm">LOT: {inv.lot_number}</span>
                            {inv.recommendation === 'expiring_soon' && (
                              <Badge variant="warning" size="sm">
                                ใกล้หมดอายุ
                              </Badge>
                            )}
                            {inv.recommendation === 'most_stock' && (
                              <Badge variant="success" size="sm">
                                แนะนำ
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {inv.expiry_date ? (
                              <span>
                                หมดอายุ: {formatDate(inv.expiry_date)}
                                {inv.days_until_expiry !== null && (
                                  <span className="ml-1">({inv.days_until_expiry} วัน)</span>
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
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm mb-3">ไม่มีสินค้านี้ในสต็อก</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddOutOfStock(showProductDetail)}
                    leftIcon={<AlertTriangle className="w-4 h-4" />}
                  >
                    จองล่วงหน้า (แจ้งให้สั่งซื้อ)
                  </Button>
                </div>
              )}

              {showProductDetail.inventory_items.length > 0 && (
                <div className="pt-3 border-t mt-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => handleAddOutOfStock(showProductDetail)}
                    leftIcon={<AlertTriangle className="w-4 h-4" />}
                  >
                    ต้องการ LOT/REF อื่นที่ไม่มีในสต็อก
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowProductDetail(null)}>
            ปิด
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
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">
                    เทมเพลท &quot;{pendingTemplateLoad.template.name}&quot;
                    มีวัสดุบางรายการไม่มีในสต็อก
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
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.product_name}</p>
                    <p className="text-xs text-gray-500">
                      REF: {item.requested_ref || item.ref_number}
                    </p>
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
            onClick={() => {
              setShowOosConfirmModal(false);
              setPendingTemplateLoad(null);
            }}
          >
            ยกเลิก
          </Button>
          <Button variant="outline" onClick={confirmTemplateWithoutOos}>
            เฉพาะที่มีในสต็อก
          </Button>
          <Button onClick={confirmTemplateWithOos}>จองทั้งหมด (รวม OOS)</Button>
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
                  <p className="font-medium text-yellow-800">สินค้านี้ไม่มีในสต็อก</p>
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
        title="เปลี่ยนรายการในตะกร้า"
        message="ต้องการเปลี่ยนรายการในตะกร้า? รายการเดิมจะถูกแทนที่ด้วยเทมเพลทที่เลือก"
        variant="warning"
        confirmText="เปลี่ยน"
        cancelText="ยกเลิก"
      />
    </>
  );
}
