"use client";

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

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

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Noto Sans KR', color: '#1a1a1a' },
  header: { marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2pt solid #1a1a1a', paddingBottom: 10 },
  title: { fontSize: 20, fontFamily: 'Noto Sans KR', fontWeight: 'bold', letterSpacing: 1, color: '#000' },
  subtitle: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  section: { marginBottom: 15, flexDirection: 'row', gap: 10 },
  box: { flex: 1, border: '1pt solid #e5e7eb', padding: 10, minHeight: 80, borderRadius: 3 },
  label: { fontSize: 7, color: '#6b7280', marginBottom: 4, fontWeight: 'bold', textTransform: 'uppercase' },
  value: { fontSize: 10, fontWeight: 'bold', marginBottom: 3 },
  text: { fontSize: 8, lineHeight: 1.3, color: '#374151' },
  table: { marginTop: 15 },
  tableRow: { flexDirection: 'row', borderBottom: '0.5pt solid #e5e7eb', minHeight: 25, alignItems: 'center' },
  tableHeader: { backgroundColor: '#f9fafb', borderBottom: '1.5pt solid #1a1a1a', borderTop: '1pt solid #e5e7eb', fontWeight: 'bold' },
  col1: { width: '8%', paddingLeft: 6 },
  col2: { width: '12%', textAlign: 'center' },
  col3: { width: '20%', textAlign: 'center' },
  col4: { width: '15%', textAlign: 'center' },
  col5: { width: '15%', textAlign: 'center' },
  col6: { width: '15%', textAlign: 'center' },
  col7: { width: '15%', textAlign: 'center', paddingRight: 6 },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, borderTop: '0.5pt solid #e5e7eb', paddingTop: 10, textAlign: 'center', fontSize: 7, color: '#9ca3af' },
  notice: { marginTop: 20, padding: 8, backgroundColor: '#fef3c7', border: '0.5pt solid #f59e0b', borderRadius: 3 },
  noticeText: { fontSize: 8, color: '#92400e', textAlign: 'center' },
  totalSection: { marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end' },
  totalBox: { width: '40%', backgroundColor: '#f9fafb', padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 3, border: '1pt solid #1a1a1a' },
  totalLabel: { fontSize: 10, fontWeight: 'bold' },
  totalValue: { fontSize: 12, fontWeight: 'bold' },
  signatureSection: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
  signatureBox: { flex: 1, border: '0.5pt solid #e5e7eb', padding: 10, minHeight: 60 },
  signatureLine: { marginTop: 30, borderTop: '0.5pt solid #1a1a1a', width: '80%' },
  serviceInfo: { marginBottom: 15, padding: 8, backgroundColor: '#eff6ff', border: '0.5pt solid #3b82f6', borderRadius: 3, flexDirection: 'row', gap: 15 },
  serviceLabel: { fontSize: 7, color: '#6b7280', fontWeight: 'bold' },
  serviceValue: { fontSize: 9, color: '#1e40af', fontWeight: 'bold' },
});

export interface UpsInvoiceData {
  invoice_no: string;
  date: string;
  shipper: { name: string; address: string; contact: string };
  consignee: { name: string; address: string; contact: string; country_code: string };
  order_no: string;
  packages: Array<{ ref_seq: number; domestic_ref_no?: string | null; intl_ref_no?: string | null; actual_weight_kg: number; volumetric_weight_kg?: number; chargeable_weight_kg?: number; description: string; quantity: number; declared_value_usd?: number }>;
  ups_service: { product_name: string; product_code: string; zone_code?: string; delivery_method?: string };
  total_weight_kg: number;
  total_declared_value_usd: number;
}

export interface UpsInvoiceLabels {
  title: string; subtitle: string; issue_date: string; shipper: string; consignee: string; order_ref: string; package_list: string; pkg_no: string; domestic_ref: string; intl_ref: string; weight: string; description: string; quantity: string; declared_value: string; total: string; ups_service: string; product: string; zone: string; delivery_method: string; notice: string; total_weight: string; total_declared_value: string; shipper_signature: string; date_label: string; for_customs_only: string; generated_on: string; chargeable_weight: string;
}

interface UpsInvoicePDFProps { data: UpsInvoiceData; labels: UpsInvoiceLabels; }

const UpsInvoicePDF = ({ data, labels }: UpsInvoicePDFProps) => (
  <Document title={`UPS_INV_${data.invoice_no}`} author="ZENITH LMS">
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{labels.title}</Text>
          <Text style={styles.subtitle}>{labels.subtitle}</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
          <Text style={styles.label}>{labels.issue_date}</Text>
          <Text style={styles.value}>{data.date}</Text>
          <Text style={styles.text}>INV: {data.invoice_no}</Text>
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.shipper}</Text>
          <Text style={styles.value}>{data.shipper.name}</Text>
          <Text style={styles.text}>{data.shipper.address}</Text>
          <Text style={styles.text}>{data.shipper.contact}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.consignee}</Text>
          <Text style={styles.value}>{data.consignee.name}</Text>
          <Text style={styles.text}>{data.consignee.address}</Text>
          <Text style={styles.text}>{data.consignee.contact}</Text>
          <Text style={styles.text}>Country: {data.consignee.country_code}</Text>
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.order_ref}</Text>
          <Text style={styles.value}>{data.order_no}</Text>
        </View>
        <View style={styles.serviceInfo}>
          <View>
            <Text style={styles.serviceLabel}>{labels.product}</Text>
            <Text style={styles.serviceValue}>{data.ups_service.product_name} ({data.ups_service.product_code})</Text>
          </View>
          {data.ups_service.zone_code && (<View><Text style={styles.serviceLabel}>{labels.zone}</Text><Text style={styles.serviceValue}>{data.ups_service.zone_code}</Text></View>)}
          {data.ups_service.delivery_method && (<View><Text style={styles.serviceLabel}>{labels.delivery_method}</Text><Text style={styles.serviceValue}>{data.ups_service.delivery_method}</Text></View>)}
        </View>
      </View>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.col1}>{labels.pkg_no}</Text>
          <Text style={styles.col2}>{labels.domestic_ref}</Text>
          <Text style={styles.col3}>{labels.intl_ref}</Text>
          <Text style={styles.col4}>{labels.weight}</Text>
          <Text style={styles.col5}>{labels.description}</Text>
          <Text style={styles.col6}>{labels.quantity}</Text>
          <Text style={styles.col7}>{labels.declared_value}</Text>
        </View>
        {data.packages.map((pkg, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.col1}>{pkg.ref_seq}</Text>
            <Text style={styles.col2}>{pkg.domestic_ref_no || '-'}</Text>
            <Text style={styles.col3}>{pkg.intl_ref_no || '-'}</Text>
            <Text style={styles.col4}>{pkg.chargeable_weight_kg?.toFixed(2) || pkg.actual_weight_kg.toFixed(2)} kg</Text>
            <Text style={styles.col5}>{pkg.description}</Text>
            <Text style={styles.col6}>{pkg.quantity}</Text>
            <Text style={styles.col7}>{pkg.declared_value_usd?.toFixed(2) || '0.00'} USD</Text>
          </View>
        ))}
      </View>
      <View style={styles.totalSection}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>{labels.total_weight}</Text>
          <Text style={styles.totalValue}>{data.total_weight_kg.toFixed(2)} kg</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>{labels.total_declared_value}</Text>
          <Text style={styles.totalValue}>{data.total_declared_value_usd.toFixed(2)} USD</Text>
        </View>
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{labels.for_customs_only}</Text>
      </View>
      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <Text style={styles.label}>{labels.shipper_signature}</Text>
          <View style={styles.signatureLine} />
          <Text style={styles.text}>{labels.date_label}</Text>
        </View>
      </View>
      <Text style={styles.footer}>{labels.generated_on} {new Date().toLocaleString()} | ZENITH LMS</Text>
    </Page>
  </Document>
);

export default UpsInvoicePDF;
