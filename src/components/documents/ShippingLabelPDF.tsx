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
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Noto Sans KR',
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2pt solid #1a1a1a',
    paddingBottom: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  box: {
    flex: 1,
    border: '1pt solid #e5e7eb',
    padding: 10,
    borderRadius: 4,
  },
  label: {
    fontSize: 7,
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
    fontSize: 8,
    lineHeight: 1.4,
    color: '#374151',
  },
  barcodePlaceholder: {
    width: '100%',
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
  },
  barcodeText: {
    fontSize: 8,
    color: '#9ca3af',
    letterSpacing: 4,
  },
  table: {
    marginTop: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #e5e7eb',
    minHeight: 24,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    borderBottom: '1.5pt solid #1a1a1a',
    fontWeight: 'bold',
  },
  col1: { width: '50%', paddingLeft: 6 },
  col2: { width: '20%', textAlign: 'center' },
  col3: { width: '15%', textAlign: 'center' },
  col4: { width: '15%', textAlign: 'center' },
  summary: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 4,
    border: '1pt solid #1a1a1a',
  },
  summaryItem: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginLeft: 20,
  },
  summaryLabel: {
    fontSize: 7,
    color: '#6b7280',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTop: '0.5pt solid #e5e7eb',
    paddingTop: 10,
    textAlign: 'center',
    fontSize: 7,
    color: '#9ca3af',
  },
});

interface ShippingLabelProps {
  data: {
    order_no: string;
    date: string;
    shipper: {
      name: string;
      address: string;
    };
    consignee: {
      name: string;
      address: string;
      phone: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      weight: number;
    }>;
    total_pkgs: number;
    total_weight: number;
  };
  labels: {
    shipping_label: string;
    order_ref: string;
    issue_date: string;
    shipper: string;
    consignee: string;
    phone: string;
    item_desc: string;
    qty: string;
    weight: string;
    total_pkgs: string;
    carrier_barcode: string;
    generated_on: string;
  };
}

const ShippingLabelPDF = ({ data, labels }: ShippingLabelProps) => (
  <Document title={`SL_${data.order_no}`} author="ZENITH LMS">
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{labels.shipping_label}</Text>
          <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>{labels.order_ref}: {data.order_no}</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
          <Text style={styles.label}>{labels.issue_date}</Text>
          <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{data.date}</Text>
        </View>
      </View>

      <View style={styles.barcodePlaceholder}>
        <Text style={styles.barcodeText}>|{data.order_no}|</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.shipper}</Text>
          <Text style={styles.value}>{data.shipper.name}</Text>
          <Text style={styles.text}>{data.shipper.address}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.consignee}</Text>
          <Text style={styles.value}>{data.consignee.name}</Text>
          <Text style={styles.text}>{data.consignee.address}</Text>
          <Text style={styles.text}>{labels.phone}: {data.consignee.phone}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.col1}>{labels.item_desc}</Text>
          <Text style={styles.col2}>{labels.qty}</Text>
          <Text style={styles.col3}>{labels.weight}</Text>
        </View>
        {data.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.col1}>{item.description}</Text>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>{item.weight.toFixed(2)} kg</Text>
          </View>
        ))}
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{labels.total_pkgs}</Text>
          <Text style={styles.summaryValue}>{data.total_pkgs}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{labels.weight}</Text>
          <Text style={styles.summaryValue}>{data.total_weight.toFixed(2)} kg</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        ZENITH LMS • {labels.generated_on} {new Date().toLocaleString()}
      </Text>
    </Page>
  </Document>
);

export default ShippingLabelPDF;
