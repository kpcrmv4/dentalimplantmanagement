'use client';

import { useState, useCallback } from 'react';
import { X, Search, Package, Plus, AlertTriangle } from 'lucide-react';
import { Button, Badge, Input } from '@/components/ui';
import { PhotoUpload } from './PhotoUpload';
import { useProductSearch } from '@/hooks/useApi';
import type { ProductSearchResult, InventorySearchItem } from '@/types/database';

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onAddMaterial: (
    productId: string,
    inventoryId: string | null,
    quantity: number,
    photoUrls: string[],
    notes?: string
  ) => Promise<void>;
}

export function AddMaterialModal({
  isOpen,
  onClose,
  caseId,
  onAddMaterial,
}: AddMaterialModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<InventorySearchItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'search' | 'select-lot' | 'confirm'>('search');

  const { data: searchResults, isLoading: isSearching } = useProductSearch(
    searchTerm.length >= 2 ? searchTerm : ''
  );

  if (!isOpen) return null;

  const handleSelectProduct = (product: ProductSearchResult) => {
    setSelectedProduct(product);
    if (product.inventory_items.length === 1) {
      setSelectedInventory(product.inventory_items[0]);
      setStep('confirm');
    } else if (product.inventory_items.length > 1) {
      setStep('select-lot');
    } else {
      // Out of stock - allow adding anyway with null inventory
      setSelectedInventory(null);
      setStep('confirm');
    }
  };

  const handleSelectInventory = (inventory: InventorySearchItem) => {
    setSelectedInventory(inventory);
    setStep('confirm');
  };

  const handleBack = () => {
    if (step === 'confirm') {
      if (selectedProduct && selectedProduct.inventory_items.length > 1) {
        setStep('select-lot');
      } else {
        setStep('search');
        setSelectedProduct(null);
      }
    } else if (step === 'select-lot') {
      setStep('search');
      setSelectedProduct(null);
    }
    setSelectedInventory(null);
    setPhotos([]);
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;

    if (photos.length === 0) {
      setError('กรุณาถ่ายรูปหลักฐานการใช้งาน');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onAddMaterial(
        selectedProduct.id,
        selectedInventory?.id || null,
        quantity,
        photos,
        notes || undefined
      );
      // Reset and close
      resetForm();
      onClose();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเพิ่มวัสดุ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSearchTerm('');
    setSelectedProduct(null);
    setSelectedInventory(null);
    setQuantity(1);
    setPhotos([]);
    setNotes('');
    setStep('search');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">เพิ่มวัสดุ</h3>
            <p className="text-sm text-gray-500">
              {step === 'search' && 'ค้นหาวัสดุที่ต้องการเพิ่ม'}
              {step === 'select-lot' && 'เลือก LOT ที่ต้องการใช้'}
              {step === 'confirm' && 'ยืนยันการใช้วัสดุ'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Search */}
          {step === 'search' && (
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ค้นหาชื่อ, REF, หรือ SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              {isSearching && (
                <div className="py-8 text-center text-gray-500">
                  กำลังค้นหา...
                </div>
              )}

              {!isSearching && searchResults && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 transition-colors"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {product.ref_number && <span>REF: {product.ref_number}</span>}
                            {product.brand && <span className="ml-2">{product.brand}</span>}
                          </div>
                        </div>
                        <Badge
                          variant={product.available_stock > 0 ? 'success' : 'danger'}
                          size="sm"
                        >
                          {product.available_stock > 0
                            ? `${product.available_stock} พร้อม`
                            : 'หมดสต็อก'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!isSearching && searchTerm.length >= 2 && searchResults?.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>ไม่พบวัสดุที่ค้นหา</p>
                </div>
              )}

              {searchTerm.length < 2 && (
                <div className="py-8 text-center text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select LOT */}
          {step === 'select-lot' && selectedProduct && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-gray-500">
                  REF: {selectedProduct.ref_number}
                </p>
              </div>

              <p className="text-sm font-medium text-gray-700">เลือก LOT:</p>
              <div className="space-y-2">
                {selectedProduct.inventory_items.map((inventory) => (
                  <button
                    key={inventory.id}
                    className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 transition-colors"
                    onClick={() => handleSelectInventory(inventory)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">LOT: {inventory.lot_number}</p>
                        {inventory.expiry_date && (
                          <p className="text-sm text-gray-500">
                            หมดอายุ: {inventory.expiry_date}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          inventory.recommendation === 'expiring_soon'
                            ? 'warning'
                            : 'success'
                        }
                        size="sm"
                      >
                        {inventory.available_quantity} ชิ้น
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && selectedProduct && (
            <div className="space-y-4">
              {/* Selected Material Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">
                      {selectedProduct.name}
                    </p>
                    <div className="text-sm text-blue-700 mt-1 space-y-0.5">
                      {selectedProduct.ref_number && (
                        <p>REF: {selectedProduct.ref_number}</p>
                      )}
                      {selectedInventory && (
                        <p>LOT: {selectedInventory.lot_number}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Out of Stock Warning */}
              {!selectedInventory && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">วัสดุไม่มีในสต็อก</p>
                    <p>การใช้งานจะถูกบันทึกแต่ไม่มีการตัดสต็อก</p>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จำนวน
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                    min={1}
                    max={selectedInventory?.available_quantity || 999}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setQuantity(
                        Math.min(
                          selectedInventory?.available_quantity || 999,
                          quantity + 1
                        )
                      )
                    }
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Photo Upload */}
              <PhotoUpload
                photos={photos}
                onPhotosChange={setPhotos}
                maxPhotos={5}
                required={true}
              />

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  หมายเหตุ (ถ้ามี)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={2}
                  placeholder="เหตุผลที่เพิ่มวัสดุ เช่น หมอเปลี่ยนใจ..."
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
          {step !== 'search' && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              ย้อนกลับ
            </Button>
          )}
          {step === 'search' && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleClose}
            >
              ยกเลิก
            </Button>
          )}
          {step === 'confirm' && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting || photos.length === 0}
            >
              {isSubmitting ? (
                'กำลังบันทึก...'
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  เพิ่มวัสดุ
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
