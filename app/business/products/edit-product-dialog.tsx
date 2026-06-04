"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/shared/product-form";
import {
  deleteProductAction,
  updateProductAction,
} from "@/actions/products";

export type EditableProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  category: string;
  status: "active" | "inactive";
  images: string[];
  hasVariants: boolean;
  optionNames: string[];
  variants: {
    options: { name: string; value: string }[];
    price: number;
    wholesalePrice: number;
    stock: number;
    status: "active" | "inactive";
  }[];
};

export function EditProductDialog({ product }: { product: EditableProduct }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [removing, startRemove] = useTransition();

  const boundUpdate = updateProductAction.bind(null, product.id);

  const onRemove = () => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    startRemove(async () => {
      const res = await deleteProductAction(product.id);
      if (res.ok) {
        toast.success("Product deleted");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <ProductForm
          action={boundUpdate}
          submitLabel="Save changes"
          initial={{
            name: product.name,
            description: product.description,
            price: product.price,
            wholesalePrice: product.wholesalePrice,
            stock: product.stock,
            category: product.category,
            status: product.status,
            images: product.images,
            hasVariants: product.hasVariants,
            optionNames: product.optionNames,
            variants: product.variants,
          }}
          onSuccess={() => {
            toast.success("Product updated");
            setOpen(false);
            router.refresh();
          }}
        />
        <DialogFooter className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onRemove}
            disabled={removing}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {removing ? "Deleting..." : "Delete product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
