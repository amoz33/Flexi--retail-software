"use client";

import { Barcode, FileSpreadsheet, ImagePlus, Plus, Save, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";

const emptyAttribute = { name: "", value: "" };
const emptyVariant = { name: "", sku: "", barcode: "", price: "", stock: "" };

function readValue(row, keys, fallback = "") {
  const key = keys.find((candidate) => row[candidate] !== undefined && row[candidate] !== null);
  return key ? String(row[key]).trim() : fallback;
}

function readNumber(row, keys) {
  const value = readValue(row, keys, "0").replace(/[,\s]/g, "");
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseAttributes(value) {
  if (!value) return [];
  return value.split(";").map((part) => {
    const [name, ...rest] = part.split(":");
    return { name: (name || "").trim(), value: rest.join(":").trim() };
  }).filter((attribute) => attribute.name || attribute.value);
}

function parseVariants(value) {
  if (!value) return [];
  return value.split(";").map((part) => {
    const [name, sku, barcode, price, stock] = part.split("|").map((item) => (item || "").trim());
    return {
      name,
      sku,
      barcode,
      price: price || "",
      stock: stock || ""
    };
  }).filter((variant) => variant.name || variant.sku);
}

function rowToProduct(row, index) {
  const name = readValue(row, ["Name", "name", "Product", "product"]);
  const sku = readValue(row, ["SKU", "sku"]);

  if (!name || !sku) return null;

  return {
    id: Date.now() + index,
    name,
    sku,
    barcode: readValue(row, ["Barcode", "barcode"]),
    expiryDate: readValue(row, ["Expiry Date", "Expiry", "Expire Date", "expiryDate", "expiry"]),
    description: readValue(row, ["Description", "description"]),
    images: readValue(row, ["Images", "images"]).split(",").map((image) => image.trim()).filter(Boolean),
    attributes: parseAttributes(readValue(row, ["Attributes", "attributes"])),
    variants: parseVariants(readValue(row, ["Variants", "variants"])),
    price: readNumber(row, ["Price", "price", "Base Price", "basePrice"]),
    costPrice: readNumber(row, ["Cost Price", "costPrice", "Cost"]),
    stock: readNumber(row, ["Stock", "stock"]),
    soldCount: readNumber(row, ["Sold", "soldCount"]),
    revenue: readNumber(row, ["Revenue", "revenue"])
  };
}

export default function ProductCreateForm({ onCreateProduct, onImportProducts }) {
  const [attributes, setAttributes] = useState([{ ...emptyAttribute }]);
  const [variants, setVariants] = useState([{ ...emptyVariant }]);
  const [imageFiles, setImageFiles] = useState([]);
  const [importMessage, setImportMessage] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const barcodeInputRef = useRef(null);

  function updateAttribute(index, field, value) {
    setAttributes((items) => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function updateVariant(index, field, value) {
    setVariants((items) => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function removeAttribute(index) {
    setAttributes((items) => items.length === 1 ? items : items.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeVariant(index) {
    setVariants((items) => items.length === 1 ? items : items.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleImages(event) {
    const files = Array.from(event.target.files || []);
    Promise.all(files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, src: reader.result });
      reader.onerror = () => resolve({ name: file.name, src: "" });
      reader.readAsDataURL(file);
    }))).then(setImageFiles);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const product = {
      id: Date.now(),
      name: formData.get("name")?.trim(),
      sku: formData.get("sku")?.trim(),
      barcode: formData.get("barcode")?.trim(),
      expiryDate: formData.get("expiryDate") || "",
      description: formData.get("description")?.trim(),
      images: imageFiles.map((image) => image.src).filter(Boolean),
      attributes: attributes.filter((attribute) => attribute.name || attribute.value),
      variants: variants.filter((variant) => variant.name || variant.sku),
      price: Number(formData.get("price") || 0),
      costPrice: Number(formData.get("costPrice") || 0),
      stock: Number(formData.get("stock") || 0),
      soldCount: 0,
      revenue: 0
    };

    onCreateProduct(product);
    setImportMessage(`${product.name} has been added to the table.`);
    event.currentTarget.reset();
    setAttributes([{ ...emptyAttribute }]);
    setVariants([{ ...emptyVariant }]);
    setImageFiles([]);
  }

  function handleReset() {
    setAttributes([{ ...emptyAttribute }]);
    setVariants([{ ...emptyVariant }]);
    setImageFiles([]);
    setImportMessage("");
  }

  function handleDownloadTemplate() {
    const templateRows = [
      {
        "Name": "Sample Product",
        "SKU": "SAMPLE-001",
        "Barcode": "SAMPLE-001",
        "Expiry Date": "",
        "Description": "Optional product description",
        "Price": 5000,
        "Cost Price": 3500,
        "Stock": 20,
        "Images": "",
        "Attributes": "Color:Red;Size:Large",
        "Variants": "Small|SAMPLE-001-S|SAMPLE-001-S|4500|10;Large|SAMPLE-001-L|SAMPLE-001-L|5000|10"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    worksheet["!cols"] = [
      { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 30 },
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 20 }, { wch: 24 }, { wch: 40 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "flexi-retail-product-import-template.xlsx");
  }

  function handleWorkbookUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const workbook = XLSX.read(loadEvent.target.result, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      const importedProducts = rows.map(rowToProduct).filter(Boolean);

      if (!importedProducts.length) {
        setImportMessage("No valid products found. Use columns for Name and SKU at minimum.");
        return;
      }

      onImportProducts(importedProducts);
      setImportMessage(`${importedProducts.length} product${importedProducts.length === 1 ? "" : "s"} imported into the table.`);
    };

    reader.readAsArrayBuffer(file);
    event.target.value = "";
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <div className="excel-import-panel">
        <div>
          <h3><FileSpreadsheet /> Import Excel Sheet</h3>
          <p>Columns should include Name, SKU, Expiry Date, Cost Price, Selling Price (or Price), and Stock. Barcode, description, images, attributes, and variants are optional. Not sure of the exact format? Download the template first.</p>
        </div>
        <div className="excel-import-buttons" style={{ display: "flex", gap: "10px" }}>
          <button className="btn-outline" type="button" onClick={handleDownloadTemplate}>
            <FileSpreadsheet /> Download Template
          </button>
          <label className="btn-outline excel-upload-button">
            <Upload /> Upload Sheet
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleWorkbookUpload} />
          </label>
        </div>
      </div>

      {importMessage && <div className="form-message">{importMessage}</div>}

      {scannerActive && (
        <div className="scanner-notice" style={{
          padding: "12px 16px",
          backgroundColor: "#e3f2fd",
          borderLeft: "4px solid #2196f3",
          marginBottom: "16px",
          borderRadius: "4px",
          fontSize: "14px",
          color: "#1565c0"
        }}>
          🔍 Scanner is active. Point your barcode scanner at the screen or position camera over the barcode. Press Enter after scanning.
        </div>
      )}

      <div className="asset-barcode-scan-row">
        <button
          className="btn-gold asset-scan-toggle"
          type="button"
          onClick={() => {
            setScannerActive((active) => !active);
            setTimeout(() => barcodeInputRef.current?.focus(), 0);
          }}
        >
          <Barcode /> {scannerActive ? "Scanner Active" : "Enable Scanner"}
        </button>

        <label className="field-group asset-barcode-field">
          <span>Barcode</span>
          <input
            ref={barcodeInputRef}
            type="text"
            name="barcode"
            placeholder="Scan or type barcode"
            autoComplete="off"
            autoFocus={scannerActive}
          />
        </label>
      </div>

      <div className="form-grid">
        <label className="field-group">
          <span>Name</span>
          <input type="text" name="name" placeholder="iPhone 15 Pro Max" required />
        </label>

        <label className="field-group">
          <span>SKU</span>
          <input type="text" name="sku" placeholder="APL-15PM" required />
        </label>

        <label className="field-group">
          <span>Cost Price</span>
          <input type="number" name="costPrice" min="0" placeholder="595000" required />
        </label>

        <label className="field-group">
          <span>Selling Price</span>
          <input type="number" name="price" min="0" placeholder="850000" required />
        </label>

        <label className="field-group">
          <span>Stock</span>
          <input type="number" name="stock" min="0" placeholder="12" />
        </label>

        <label className="field-group">
          <span>Expiry Date</span>
          <input type="date" name="expiryDate" required />
        </label>

        <label className="field-group field-span-2">
          <span>Description</span>
          <textarea name="description" rows="5" placeholder="Key details, warranty notes, package contents, and selling points." />
        </label>

        <label className="image-upload">
          <ImagePlus />
          <span>Images</span>
          <strong>{imageFiles.length ? `${imageFiles.length} selected` : "Upload product images"}</strong>
          <input type="file" name="images" accept="image/*" multiple onChange={handleImages} />
        </label>
      </div>

      {imageFiles.length > 0 && (
        <div className="file-list" aria-label="Selected images">
          {imageFiles.map((image) => <span key={image.name}>{image.name}</span>)}
        </div>
      )}

      <div className="form-panel">
        <div className="form-panel-header">
          <h2>Attributes</h2>
          <button className="btn-outline" type="button" onClick={() => setAttributes((items) => [...items, { ...emptyAttribute }])}>
            <Plus /> Add Attribute
          </button>
        </div>

        <div className="repeat-list">
          {attributes.map((attribute, index) => (
            <div className="repeat-row attribute-row" key={index}>
              <input
                aria-label={`Attribute ${index + 1} name`}
                placeholder="Attribute name"
                value={attribute.name}
                onChange={(event) => updateAttribute(index, "name", event.target.value)}
              />
              <input
                aria-label={`Attribute ${index + 1} value`}
                placeholder="Value"
                value={attribute.value}
                onChange={(event) => updateAttribute(index, "value", event.target.value)}
              />
              <button className="icon-button" type="button" onClick={() => removeAttribute(index)} aria-label="Remove attribute">
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="form-panel">
        <div className="form-panel-header">
          <h2>Product Variants</h2>
          <button className="btn-outline" type="button" onClick={() => setVariants((items) => [...items, { ...emptyVariant }])}>
            <Plus /> Add Variant
          </button>
        </div>

        <div className="repeat-list">
          {variants.map((variant, index) => (
            <div className="repeat-row variant-row" key={index}>
              <input
                aria-label={`Variant ${index + 1} name`}
                placeholder="Variant"
                value={variant.name}
                onChange={(event) => updateVariant(index, "name", event.target.value)}
              />
              <input
                aria-label={`Variant ${index + 1} SKU`}
                placeholder="SKU"
                value={variant.sku}
                onChange={(event) => updateVariant(index, "sku", event.target.value)}
              />
              <input
                aria-label={`Variant ${index + 1} barcode`}
                placeholder="Barcode"
                value={variant.barcode}
                onChange={(event) => updateVariant(index, "barcode", event.target.value)}
              />
              <input
                aria-label={`Variant ${index + 1} price`}
                type="number"
                min="0"
                placeholder="Price"
                value={variant.price}
                onChange={(event) => updateVariant(index, "price", event.target.value)}
              />
              <input
                aria-label={`Variant ${index + 1} stock`}
                type="number"
                min="0"
                placeholder="Stock"
                value={variant.stock}
                onChange={(event) => updateVariant(index, "stock", event.target.value)}
              />
              <button className="icon-button" type="button" onClick={() => removeVariant(index)} aria-label="Remove variant">
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-outline" type="reset" onClick={handleReset}>Clear</button>
        <button className="btn-gold" type="submit"><Save /> Save Product</button>
      </div>
    </form>
  );
}
