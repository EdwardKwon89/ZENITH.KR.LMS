"use client";

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Font registration for CJK support
Font.register({
  family: 'Noto Sans KR',
  src: 'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT-Regular.woff2',
  fontWeight: 'normal',
});

Font.register({
  family: 'Noto Sans KR',
  src: 'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT-Bold.woff2',
  fontWeight: 'bold',
});

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Noto Sans KR',
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2pt solid #1a1a1a',
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Noto Sans KR',
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#000',
  },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 15,
    flexDirection: 'row',
    gap: 15,
  },
  box: {
    flex: 1,
    border: '1pt solid #e5e7eb',
    padding: 10,
    minHeight: 80,
    borderRadius: 4,
  },
  label: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  text: {
    fontSize: 9,
    lineHeight: 1.3,
    color: '#374151',
  },
  table: {
    marginTop: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #e5e7eb',
    minHeight: 28,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    borderBottom: '1.5pt solid #1a1a1a',
    borderTop: '1pt solid #e5e7eb',
    fontWeight: 'bold',
  },
  colSeq: { width: '8%', paddingLeft: 6, textAlign: 'center' },
  colRef: { width: '18%', paddingLeft: 4 },
  colDesc: { width: '22%', paddingLeft: 4 },
  colQty: { width: '10%', textAlign: 'center' },
  colWeight: { width: '12%', textAlign: 'right', paddingRight: 6 },
  colVolWeight: { width: '12%', textAlign: 'right', paddingRight: 6 },
  colPrice: { width: '18%', textAlign: 'right', paddingRight: 6 },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: '0.5pt solid #e5e7eb',
    paddingTop: 12,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
  totalSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalBox: {
    width: '50%',
    backgroundColor: '#f9fafb',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 4,
    border: '1pt solid #1a1a1a',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  notice: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fffbeb',
    border: '1pt solid #fcd34d',
    borderRadius: 4,
  },
  noticeText: {
    fontSize: 9,
    color: '#92400e',
    textAlign: 'center',
  },
  signatureBox: {
    marginTop: 30,
    borderTop: '1pt solid #e5e7eb',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  signatureLine: {
    width: '40%',
    borderBottom: '1pt solid #1a1a1a',
    marginTop: 20,
    marginBottom: 4,
  },
  upsServiceBox: {
    marginTop: 10,
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#eff6ff',
    border: '1pt solid #bfdbfe',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  upsServiceLabel: {
    fontSize: 8,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  upsServiceValue: {
    fontSize: 9,
    color: '#1e40af',
    fontWeight: 'bold',
  },
});

export interface UpsInvoiceItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
}

export interface UpsInvoicePackage {
  ref_seq: number;
  domestic_ref_no?: string | null;
  intl_ref_no?: string | null;
  actual_weight_kg: number;
  volumetric_weight_kg: number;
  items: UpsInvoiceItem[];
}

export interface UpsInvoiceData {
  invoice_no: string;
  date: string;
  shipper: {
    name: string;
    address: string;
    contact?: string;
  };
  consignee: {
    name: string;
    address: string;
    country?: string;
    contact?: string;
  };
  packages: UpsInvoicePackage[];
  ups_service: {
    product_code?: string;
    product_name?: string;
    zone?: string;
    delivery_method?: string;
  };
  total_weight: number;
  total_volumetric_weight: number;
  total_declared_value: number;
  currency: string;
}

export interface UpsInvoiceLabels {
  title: string;
  issue_date: string;
  shipper: string;
  consignee: string;
  order_ref: string;
  pkg_seq: string;
  ref_no: string;
  item_desc: string;
  quantity: string;
  weight: string;
  vol_weight: string;
  unit_price: string;
  sub_total: string;
  total: string;
  currency: string;
  total_weight_label: string;
  total_vol_weight_label: string;
  ups_service: string;
  product: string;
  zone: string;
  delivery_method: string;
  notice: string;
  notice_text: string;
  signature: string;
  generated_on: string;
}

interface UpsInvoicePDFProps {
  data: UpsInvoiceData;
  labels: UpsInvoiceLabels;
}

const UpsInvoicePDF = ({ data, labels }: UpsInvoicePDFProps) => (
  <Document title={`UPS_INVOICE_${data.invoice_no}`} author="ZENITH LMS">
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{labels.title}</Text>
          <Text style={styles.subtitle}>UPS International Express — Simplified Commercial Invoice</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
          <Text style={styles.label}>{labels.issue_date}</Text>
          <Text style={styles.value}>{data.date}</Text>
          <Text style={styles.label}>{labels.order_ref}</Text>
          <Text style={styles.value}>{data.invoice_no}</Text>
        </View>
      </View>

      {/* Shipper & Consignee */}
      <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.shipper}</Text>
          <Text style={styles.value}>{data.shipper.name}</Text>
          <Text style={styles.text}>{data.shipper.address}</Text>
          {data.shipper.contact && <Text style={styles.text}>{data.shipper.contact}</Text>}
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.consignee}</Text>
          <Text style={styles.value}>{data.consignee.name}</Text>
          <Text style={styles.text}>{data.consignee.address}</Text>
          {data.consignee.country && <Text style={styles.text}>{data.consignee.country}</Text>}
          {data.consignee.contact && <Text style={styles.text}>{data.consignee.contact}</Text>}
        </View>
      </View>

      {/* UPS Service Info */}
      <View style={styles.upsServiceBox}>
        <View>
          <Text style={styles.upsServiceLabel}>{labels.ups_service}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {data.ups_service.product_code && (
            <Text style={styles.upsServiceValue}>{labels.product}: {data.ups_service.product_code} {data.ups_service.product_name ? `(${data.ups_service.product_name})` : ''}</Text>
          )}
          {data.ups_service.zone && (
            <Text style={styles.upsServiceValue}>{labels.zone}: {data.ups_service.zone}</Text>
          )}
          {data.ups_service.delivery_method && (
            <Text style={styles.upsServiceValue}>{labels.delivery_method}: {data.ups_service.delivery_method}</Text>
          )}
        </View>
      </View>

      {/* Package Table */}
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.colSeq}>{labels.pkg_seq}</Text>
          <Text style={styles.colRef}>{labels.ref_no}</Text>
          <Text style={styles.colDesc}>{labels.item_desc}</Text>
          <Text style={styles.colQty}>{labels.quantity}</Text>
          <Text style={styles.colWeight}>{labels.weight}</Text>
          <Text style={styles.colVolWeight}>{labels.vol_weight}</Text>
          <Text style={styles.colPrice}>{labels.sub_total}</Text>
        </View>

        {data.packages.map((pkg, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colSeq}>{pkg.ref_seq}</Text>
            <Text style={styles.colRef}>
              {pkg.domestic_ref_no || '-'}
              {pkg.intl_ref_no ? `\n${pkg.intl_ref_no}` : ''}
            </Text>
            <Text style={styles.colDesc}>
              {pkg.items.map((item) => item.item_name).join(', ')}
            </Text>
            <Text style={styles.colQty}>
              {pkg.items.reduce((sum, item) => sum + item.quantity, 0)}
            </Text>
            <Text style={styles.colWeight}>{pkg.actual_weight_kg.toFixed(2)} kg</Text>
            <Text style={styles.colVolWeight}>{pkg.volumetric_weight_kg.toFixed(2)} kg</Text>
            <Text style={styles.colPrice}>
              {pkg.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalSection}>
        <View style={styles.totalBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.totalLabel}>{labels.total_weight_label}</Text>
            <Text style={styles.totalValue}>{data.total_weight.toFixed(2)} kg</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.totalLabel}>{labels.total_vol_weight_label}</Text>
            <Text style={styles.totalValue}>{data.total_volumetric_weight.toFixed(2)} kg</Text>
          </View>
          <View style={{ flex: 1, borderLeft: '1pt solid #e5e7eb', paddingLeft: 8 }}>
            <Text style={styles.totalLabel}>{labels.total} ({data.currency})</Text>
            <Text style={styles.totalValue}>{data.total_declared_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>
      </View>

      {/* Notice */}
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{labels.notice_text}</Text>
      </View>

      {/* Signature */}
      <View style={styles.signatureBox}>
        <View style={{ width: '45%' }}>
          <Text style={styles.signatureLabel}>{labels.signature}</Text>
          <View style={styles.signatureLine} />
          <Text style={{ fontSize: 8, color: '#9ca3af' }}>Shipper Signature</Text>
        </View>
        <View style={{ width: '45%' }}>
          <Text style={styles.signatureLabel}>{labels.signature}</Text>
          <View style={styles.signatureLine} />
          <Text style={{ fontSize: 8, color: '#9ca3af' }}>Date</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        ZENITH LMS Digital Document Services • {labels.generated_on} {new Date().toLocaleString()} • For Customs Purposes Only
      </Text>
    </Page>
  </Document>
);

export default UpsInvoicePDF;
